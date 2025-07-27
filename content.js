import { overrideImg, placeholderImgId, restoreImg } from './changeImg';
import { overrideUsername, placeholderUsername, restoreUsername } from './changeUsername';
import gameLinkRegex from './gameLinkRegex';

let port;

function isGameOver() {
  const gameOverModal = document.querySelector('.board-modal-container-container');
  const gameReviewBtn = document.querySelector('.game-review-buttons-component');
  const newGameBtns = document.querySelector('.new-game-buttons-component');

  if (gameOverModal || gameReviewBtn || newGameBtns) {
    return { cond: false, reason: 'gameover' };
  }
}

function hideOpponentInEffect() {
  const placeholderImg = document.getElementById(placeholderImgId);
  const placeholderUsernameDiv = document.getElementById(placeholderUsername);

  return Boolean(placeholderImg || placeholderUsernameDiv);
}

/**
 * - This function doesn't check for storage's `hideOpponent` and should only be called when it's already `true`.
 * - This function doesn't check if hideOpponent code is already in effect (avatar & username replaced)
 * - If return `{ cond: true }`, proceed to hide opponent.
 * - If return `{ cond: false, reason: object }`, use `hideOpponentInEffect()` to decide what to do.
 * @returns {{cond: boolean, reason?: object}} whether all conditions to hideOpponent are met.
 */
async function checkHideOpponentConds() {
  // 1. url condition
  // 2. username-related conditions
  // 3. game over-related conditions
  const url = window.location.href;
  if (!url.match(gameLinkRegex))
    return { cond: false, reason: { url } };

  const { usernames } = await browser.storage.local.get();
  const usernameDivs = Array.from(document.querySelectorAll('.player-tagline .cc-user-username-component, .player-tagline .user-username-component'));
  const usernamesInPage = usernameDivs.map(x => x.textContent.toLowerCase());
  const bothUsernamesLoaded = !usernamesInPage.includes('Opponent');

  if (!bothUsernamesLoaded) {
    return { cond: false, reason: { bothUsernamesLoaded: false } };
  }

  const usernameFromStorageIsInPage = usernames.some(u => usernamesInPage.includes(u.toLowerCase()));

  if (!usernameFromStorageIsInPage) {
    return { cond: false, reason: { usernameFromStorageIsInPage: false } };
  }

  return isGameOver() || { cond: true };
}

function startHideOpponent() {
  port.postMessage({ command: 'hideOpponent' });
  overrideImg();
  overrideUsername();
}

function stopHideOpponent() {
  port.postMessage({ command: 'unhideOpponent' });
  restoreImg();
  restoreUsername();
}

/**
 * Run:
 * 1. When port first connects
 * 2. In mutation observer
 */
async function hideOrUnhide() {
  if (hideOpponentInEffect() && isGameOver()) {
    stopHideOpponent();
  }
  else {
    const { hideOpponent } = await browser.storage.local.get();

    if (hideOpponent) {
      const result = await checkHideOpponentConds();

      if (result.cond) {
        startHideOpponent();
      }
    }
  }
}

async function connectToBackground() {
  port = browser.runtime.connect({ name: 'my-content-script-port' });
  const { hideRatings, hideOpponent } = await browser.storage.local.get();

  // 1. page loads, check storage to see what to execute
  if (hideRatings) {
    port.postMessage({ command: 'hideRatings' });
  }

  if (hideOpponent) {
    const topPlayerComp = document.querySelector('.player-component.player-top');
    if (!topPlayerComp)
      return;
    hideOrUnhide();

    const topPlayerCompObserver = new MutationObserver(async (mutationList) => {
      const topUserBlock = topPlayerComp.querySelector('.cc-user-block-component, .user-tagline-compact-theatre');
      if (!topUserBlock)
        return;

      const focusModeWasToggled = mutationList.some(m =>
        m.type === 'attributes'
        && m.attributeName === 'class'
        && m.oldValue.includes('player-component player-top'),
      );

      if (focusModeWasToggled) {
        const { hideOpponent } = await browser.storage.local.get();

        if (hideOpponent && !isGameOver()) {
          startHideOpponent();
        }
      }

      else if (mutationList.some(m => m.target.contains(topUserBlock) || topUserBlock.contains(m.target))) {
        hideOrUnhide();
      }
    });

    topPlayerCompObserver.observe(topPlayerComp, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class'],
      attributeOldValue: true,
    });
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

      if (result.cond) {
        startHideOpponent();
      }
    }
    else {
      stopHideOpponent();
    }
  }

  else if (changedFeature === 'usernames') {
    const { hideOpponent } = await browser.storage.local.get();
    if (!hideOpponent)
      return;

    const result = await checkHideOpponentConds();

    if (result.cond) {
      startHideOpponent();
    }
    else {
      if (result.reason.usernameFromStorageIsInPage === false) // undefined if reason doesn't contain this key
        stopHideOpponent();
    }
  }
});
