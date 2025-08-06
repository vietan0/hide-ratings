import features from './features';

async function initiateStorage() {
  // initiate storage after first install
  const storage = await browser.storage.local.get();

  if (Object.entries(storage).length === 0) {
    const initialValues: Record<string, boolean> = {};

    for (const { id } of features) {
      initialValues[id] = false;
    }

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
  const [changedFeature, { newValue }] = Object.entries(changes)[0]!;

  if (changedFeature !== 'hideOpponent' && changedFeature !== 'analyzeOnLichess') {
    // changes to hideOpponent are handled by content script
    const tabs = await browser.tabs.query({ url: '*://www.chess.com/*' });

    Promise.all(tabs.map(({ id }) =>
      newValue
        ? browser.scripting.insertCSS(getCSSDetails(changedFeature, id))
        : browser.scripting.removeCSS(getCSSDetails(changedFeature, id)),
    ));
  }
});
