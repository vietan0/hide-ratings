import { type ExtStorage, extStorageZ, isFeatureId } from './storageTypes';

const initialStorage: ExtStorage = {
  hideRatings: false,
  hideOpponent: false,
  hideFlags: false,
  hideOwnFlagOnHome: false,
  analyzeOnLichess: false,
  openingExplorer: false,
  database: 'lichess',
  databaseOptions: {
    lichess: {
      speeds: ['bullet', 'blitz', 'rapid', 'classical', 'correspondence'],
      ratings: [1000, 1200, 1400, 1600, 1800, 2000, 2200, 2500],
      since: undefined,
      until: undefined,
    },
    masters: {
      since: undefined,
      until: undefined,
    },
  },
};

browser.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    await browser.storage.local.set(initialStorage);
  }
  else if (details.reason === 'update') {
    console.info('details', details);
    // If an update adds new keys, fill in any missing key-value pair
    // Currently can only handle new first-level keys
    const storage = await browser.storage.local.get() as ExtStorage;
    const parseResult = extStorageZ.safeParse(storage);

    if (!parseResult.success) {
      console.info('issues', parseResult.error.issues);

      await Promise.all(parseResult.error.issues.map((issue) => {
        const erroneousStorageKey = issue.path[0] as keyof ExtStorage;

        return browser.storage.local.set({
          [erroneousStorageKey]: initialStorage[erroneousStorageKey],
        });
      }));
    }
  }
});

/**
 * @returns A `details` object to pass as argument into `insertCSS()` or `removeCSS()`
 */
function getCSSDetails(filename: string, tabId: number | undefined) {
  if (tabId === undefined)
    throw new Error(`tabId is undefined`);

  return { files: [`src/css/${filename}.css`], target: { tabId } };
}

let port: browser.runtime.Port;
let pgn: string | undefined;

browser.runtime.onConnect.addListener((p) => {
  port = p;
  console.log('BG: Port connected!', port.name);

  port.onMessage.addListener(async (message) => {
    const tabs = await browser.tabs.query({ url: '*://www.chess.com/*' });
    const msgTyped = message as { command: string; pgn?: string };

    switch (msgTyped.command) {
      case 'hideRatings':
        Promise.all(tabs.map(({ id }) => browser.scripting.insertCSS(getCSSDetails('hideRatings', id))));
        break;
      case 'hideOpponent':
        Promise.all(tabs.map(({ id }) => browser.scripting.insertCSS(getCSSDetails('hideOpponent', id))));
        break;
      case 'unhideOpponent':
        Promise.all(tabs.map(({ id }) => browser.scripting.removeCSS(getCSSDetails('hideOpponent', id))));
        break;
      case 'hideFlags':
        Promise.all(tabs.map(({ id }) => browser.scripting.insertCSS(getCSSDetails('hideFlags', id))));
        break;
      case 'hideOwnFlagOnHome':
        Promise.all(tabs.map(({ id }) => browser.scripting.insertCSS(getCSSDetails('hideOwnFlagOnHome', id))));
        break;

      case 'openLichessTab': {
        pgn = msgTyped.pgn;
        browser.tabs.create({ url: 'https://lichess.org/paste' });
        break;
      }

      case 'requestPgn': {
        port.postMessage({ pgn });
        pgn = undefined;
        break;
      }

      case 'openingExplorer':
        Promise.all(tabs.map(({ id }) => browser.scripting.insertCSS(getCSSDetails('openingExplorer', id))));
        break;

      case 'hideOpeningExplorer':
        Promise.all(tabs.map(({ id }) => browser.scripting.removeCSS(getCSSDetails('openingExplorer', id))));
        break;

      default:
        throw new Error(`Unhandled message.command: ${msgTyped.command}`);
    }
  });

  port.onDisconnect.addListener(() => {
    console.log('BG: Port disconnected!');
    // Clean up any stored ports if needed
  });
});

browser.storage.local.onChanged.addListener(async (changes) => {
  const entries = Object.entries(changes) as [keyof ExtStorage, browser.storage.StorageChange][];
  const [changedKey, { newValue }] = entries[0]!;

  if (isFeatureId(changedKey)) {
    if (changedKey !== 'hideOpponent' && changedKey !== 'analyzeOnLichess') {
    // changes to hideOpponent and analyzeOnLichess are handled by content script
      const tabs = await browser.tabs.query({ url: '*://www.chess.com/*' });

      Promise.all(tabs.map(({ id }) =>
        newValue
          ? browser.scripting.insertCSS(getCSSDetails(changedKey, id))
          : browser.scripting.removeCSS(getCSSDetails(changedKey, id)),
      ));
    }
  }
});
