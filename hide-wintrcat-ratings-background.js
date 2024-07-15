// listen to Analyse request (https://chess.wintrcat.uk/api/parse)
browser.webRequest.onBeforeRequest.addListener(
  async () => {
    // send msg to content, which will trigger function to run
    const tabs = await browser.tabs.query({
      url: 'https://chess.wintrcat.uk/*',
      active: true,
    });

    browser.tabs.sendMessage(
      tabs[0].id,
      'add-board-observer',
    );
  },
  {
    urls: ['https://chess.wintrcat.uk/api/parse'],
  },
  ['blocking'],
);
