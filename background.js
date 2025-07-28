import features from './features';

async function initiateStorage() {
  // initiate storage after first install
  const storage = await browser.storage.local.get();

  if (Object.entries(storage).length === 0) {
    const initialValues = {};

    for (const feature of features) {
      initialValues[feature] = false;
    }

    initialValues.usernames = [];
    await browser.storage.local.set(initialValues);
  }
}

initiateStorage();

/**
 *
 * @param {string} filename Name of the CSS file, no extension included.
 * @param {number} tabId
 * @returns {{ files: string[], target: { tabId: number }}} A `details` object to pass as argument into `insertCSS()` or `removeCSS()`
 */
function getCSSDetails(filename, tabId) {
  return { files: [`${filename}.css`], target: { tabId } };
}

let port;

browser.runtime.onConnect.addListener((p) => {
  port = p;
  console.log('BG: Port connected!', port.name);

  port.onMessage.addListener(async (message) => {
    const tabs = await browser.tabs.query({ url: '*://www.chess.com/*' });

    switch (message.command) {
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
      default:
        throw new Error(`Unhandled message.command: ${message.command}`);
    }
  });

  port.onDisconnect.addListener(() => {
    console.log('BG: Port disconnected!');
    // Clean up any stored ports if needed
  });
});

browser.storage.local.onChanged.addListener(async (changes) => {
  const [changedFeature] = Object.keys(changes); // I can do this because I only change one item at a time
  const newValue = changes[changedFeature].newValue;

  if (changedFeature === 'hideRatings' || changedFeature === 'hideFlags' || changedFeature === 'hideOwnFlagOnHome') {
    // changes to hideOpponent, usernames are handled by content script
    const tabs = await browser.tabs.query({ url: '*://www.chess.com/*' });

    Promise.all(tabs.map(({ id }) =>
      newValue
        ? browser.scripting.insertCSS(getCSSDetails(changedFeature, id))
        : browser.scripting.removeCSS(getCSSDetails(changedFeature, id)),
    ));
  }
});
