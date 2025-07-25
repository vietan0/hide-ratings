import { overrideImg, placeholderImgId, restoreImg } from './changeImg';
import gameLinkRegex from './gameLinkRegex';

/**
 * - If return `{ cond: true }`, proceed to hide opponent.
 * - If return `{ cond: false, reason: object }`, do nothing.
 * - If return `{ cond: 'unhide', reason: object }`, proceed to unhide opponent.
 * @returns {{cond: boolean | 'unhide', reason?: object}} whether all conditions to hideOpponent are met.
 */
async function checkHideOpponentConds() {
  const url = window.location.href;
  if (!url.match(gameLinkRegex))
    return { cond: false, reason: { url } };

  const placeholderImg = document.getElementById(placeholderImgId);
  const gameOverModal = document.querySelector('.board-modal-container-container');
  const gameOverModalNotInPage = !gameOverModal;

  if (placeholderImg) {
    if (!gameOverModalNotInPage)
      return { cond: 'unhide', reason: { gameOverModalNotInPage: false } };

    return { cond: false, reason: { placeholderImg } };
  }

  else {
    const { usernames } = await browser.storage.local.get();
    const usernameDivs = Array.from(document.querySelectorAll('.player-tagline .cc-user-username-component, .player-tagline .user-username-component'));
    const usernamesInPage = usernameDivs.map(x => x.textContent);
    const bothUsernamesLoaded = !usernamesInPage.includes('Opponent');
    const usernameFromStorageIsInPage = usernames.some(u => usernamesInPage.includes(u));

    if (!bothUsernamesLoaded) {
      return { cond: false, reason: { bothUsernamesLoaded: false } };
    }

    if (!usernameFromStorageIsInPage) {
      return { cond: false, reason: { usernameFromStorageIsInPage: false } };
    }

    if (!gameOverModalNotInPage) {
      return { cond: 'unhide', reason: { gameOverModalNotInPage: false } };
    }

    const gameReviewBtn = document.querySelector('.game-review-buttons-component');
    const gameReviewBtnNotInPage = !gameReviewBtn;

    if (!gameReviewBtnNotInPage) {
      return { cond: false, reason: { gameReviewBtnNotInPage: false } };
    }

    const newGameBtns = document.querySelector('.new-game-buttons-component');
    const newGameBtnsNotInPage = !newGameBtns;

    if (!newGameBtnsNotInPage) {
      return { cond: false, reason: { newGameBtnsNotInPage: false } };
    }

    return { cond: true };
  }
}

let port;

async function connectToBackground() {
  port = browser.runtime.connect({ name: 'my-content-script-port' });
  const { hideRatings, hideOpponent } = await browser.storage.local.get();

  // 1. page loads, check storage to see what to execute
  if (hideRatings) {
    port.postMessage({ command: 'hideRatings' });
  }

  if (hideOpponent) {
    const topPlayerTagline = document.querySelector('.player-component.player-top .player-tagline');
    if (!topPlayerTagline)
      return;

    const topPlayerTaglineObserver = new MutationObserver(async (mutationList) => {
      const topUserBlock = document.querySelector('.player-component.player-top .cc-user-block-component, .player-component.player-top .user-tagline-compact-theatre');
      if (!topUserBlock)
        return;

      if (mutationList.some(m => m.target.contains(topUserBlock) || topUserBlock.contains(m.target))) {
        const result = await checkHideOpponentConds();

        if (result.cond === true) {
          port.postMessage({ command: 'hideOpponent' });
          overrideImg();
        }
        else if (result.cond === 'unhide') {
          port.postMessage({ command: 'unhideOpponent' });
          restoreImg();
        }
      }
    });

    topPlayerTaglineObserver.observe(topPlayerTagline, { subtree: true, childList: true });
  }

  // 2. add listeners
  port.onMessage.addListener(async (message) => {
    console.log('CS received message:', message);
  });

  port.onDisconnect.addListener(() => {
    console.log('CS: Port disconnected! Attempting to reconnect...');
    // Attempt to reconnect if the background script was unloaded or connection was lost
    // This is crucial for resilience, especially with Manifest V3 service workers
    setTimeout(connectToBackground, 500); // Reconnect after a short delay
  });

  // Send an initial message to confirm the connection
  port.postMessage({ command: 'ready' });
}

// Call connect when the content script loads
connectToBackground();

browser.storage.local.onChanged.addListener(async (changes) => {
  const [changedFeature] = Object.keys(changes); // I can do this because I only change one item at a time
  const newValue = changes[changedFeature].newValue;

  if (changedFeature === 'hideOpponent') {
    if (newValue) {
      const result = await checkHideOpponentConds();

      if (result.cond === true) {
        port.postMessage({ command: 'hideOpponent' });
        overrideImg();
      }
      else if (result.cond === 'unhide') {
        port.postMessage({ command: 'unhideOpponent' });
        restoreImg();
      }
    }
    else {
      port.postMessage({ command: 'unhideOpponent' });
      restoreImg();
    }
  }

  else if (changedFeature === 'usernames') {
    const { hideOpponent } = await browser.storage.local.get();
    if (!hideOpponent)
      return;

    const result = await checkHideOpponentConds();

    if (result.cond === true) {
      port.postMessage({ command: 'hideOpponent' });
      overrideImg();
    }
    else {
      // in this particular case, unhide even if cond is false
      port.postMessage({ command: 'unhideOpponent' });
      restoreImg();
    }
  }
});
