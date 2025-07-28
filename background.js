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

let port;

browser.runtime.onConnect.addListener((p) => {
  port = p;
  console.log('BG: Port connected!', port.name);

  port.onMessage.addListener(async (message) => {
    if (message.command === 'hideRatings') {
      await browser.scripting.insertCSS({ files: ['hideRatings.css'], target: { tabId: port.sender.tab.id } });
    }

    if (message.command === 'hideOpponent') {
      const tabs = await browser.tabs.query({ url: '*://www.chess.com/*' });

      Promise.all(tabs.map(({ id }) => browser.scripting.insertCSS({ files: ['hideOpponent.css'], target: { tabId: id } })));
    }

    if (message.command === 'unhideOpponent') {
      const tabs = await browser.tabs.query({ url: '*://www.chess.com/*' });

      Promise.all(tabs.map(({ id }) => browser.scripting.removeCSS({ files: ['hideOpponent.css'], target: { tabId: id } })));
    }

    if (message.command === 'hideFlags') {
      await browser.scripting.insertCSS({ files: ['hideFlags.css'], target: { tabId: port.sender.tab.id } });
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

  if (changedFeature === 'hideRatings') {
    const tabs = await browser.tabs.query({ url: '*://www.chess.com/*' });

    Promise.all(tabs.map(({ id }) => {
      const hideRatingsArgs = { files: ['hideRatings.css'], target: { tabId: id } };

      return newValue
        ? browser.scripting.insertCSS(hideRatingsArgs)
        : browser.scripting.removeCSS(hideRatingsArgs);
    }));
  }
  else if (changedFeature === 'hideOpponent' || changedFeature === 'usernames') {
    // content will handle it and tell background what to do
  }
  else if (changedFeature === 'hideFlags') {
    const tabs = await browser.tabs.query({ url: '*://www.chess.com/*' });

    Promise.all(tabs.map(({ id }) => {
      const hideFlagsArgs = { files: ['hideFlags.css'], target: { tabId: id } };

      return newValue
        ? browser.scripting.insertCSS(hideFlagsArgs)
        : browser.scripting.removeCSS(hideFlagsArgs);
    }));
  }
});
