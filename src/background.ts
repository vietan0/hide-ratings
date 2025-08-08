import { type ExtStorage, isFeatureId } from './storageTypes';

async function initiateStorage() {
  // initiate storage after first install
  const storage = await browser.storage.local.get();

  if (Object.entries(storage).length === 0) {
    const initialValues: ExtStorage = {
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

    await browser.storage.local.set(initialValues);
  }
}

initiateStorage();

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
