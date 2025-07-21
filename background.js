import features from './features';
import gameLinkRegex from './gameLinkRegex';

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

async function startHideOpponent(tabId) {
  // only affect the player div on top
  // console.log('hide!');
  await browser.scripting.insertCSS({ files: ['hideOpponent.css'], target: { tabId } });
  browser.tabs.sendMessage(tabId, 'hide');
}

/**
 * Will run every time `game-over` message is sent to background.
 * Will also run every time storage's `hideOpponent` changes.
 * If called when not needed, will affect nothing.
 */
async function unHideOpponent(tabId) {
  // console.log('unhide!');
  // only affect the player div on top
  await browser.scripting.removeCSS({ files: ['hideOpponent.css'], target: { tabId } });
  browser.tabs.sendMessage(tabId, 'unhide');
}

async function decideToHideOpponent(tabId, url) {
  // assuming storage's hideOpponent is true
  const { usernames } = await browser.storage.local.get();

  if (url.match(gameLinkRegex) && usernames.length > 0) {
    console.log('sending msg to content');

    browser.tabs.sendMessage(tabId, 'search-for-username').then(({ usernamesInPage, gameReviewBtn, gameResultSpan }) => {
      // doesn't work when watching a game, because content return [] before any mutations happen
      /* after a game,
        - navigating through moves will go to `/game/:id?move=[number]` --> url not match,
        - navigating to final move will go to `/game/:id` --> url match, in which case check for gameReviewBtn & gameResultSpan to make sure the condition fails.
         */
      if (
        usernames.some(u => usernamesInPage.includes(u))
        && !gameReviewBtn
        && !gameResultSpan
      ) {
        console.log('all signs points to hide!');
        startHideOpponent(tabId);
      }
    });
  }
}

// 1. insert/remove CSS when a new site is visited
browser.webNavigation.onHistoryStateUpdated.addListener(async (details) => {
  const { tabId, url } = details;
  const { hideRatings, hideOpponent } = await browser.storage.local.get();

  if (hideRatings) {
    await browser.scripting.insertCSS({ files: ['hideRatings.css'], target: { tabId } });
  }

  if (hideOpponent) {
    decideToHideOpponent(tabId, url);
  }
}, {
  url: [{ hostSuffix: '.chess.com' }],
});

// 2. insert/remove CSS when local storage changes
browser.runtime.onMessage.addListener(
  async (message, sender, _sendResponse) => {
    // Bug: can't turn on in the middle of the game
    // Uncaught (in promise) Error: Could not establish connection. Receiving end does not exist.
    // Sender sent old url: https://www.chess.com/play/online/new?action=createLiveChallenge&base=60&timeIncrement=0&rated=rated
    // Not game/:gameId

    console.log('message', message);
    const tabId = sender.tab.id;

    if (message === 'game-over') {
      return unHideOpponent(tabId);
    }

    const { feature, newValue } = message;

    if (feature === 'hideRatings') {
      const hideRatingsArgs = { files: ['hideRatings.css'], target: { tabId } };

      if (newValue)
        await browser.scripting.insertCSS(hideRatingsArgs);
      else
        await browser.scripting.removeCSS(hideRatingsArgs);
    }
    else if (feature === 'hideOpponent') {
      if (newValue) {
        console.log('tabId', tabId);
        console.log('message.url', message.url);
        decideToHideOpponent(tabId, message.url);
      }
      else {
        unHideOpponent(tabId);
      }
    }
    // else {
    //   // feature === 'hideFlags'
    // }
  },
);
