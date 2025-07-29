import { overrideImg, placeholderImgId, restoreImg } from './changeImg';
import { overrideUsername, placeholderUsername, restoreUsername } from './changeUsername';

let port;

function usernameFail() {
  const currentUsername = document.getElementById('notifications-request').getAttribute('username');
  const usernameDivs = Array.from(document.querySelectorAll('.player-tagline .cc-user-username-component, .player-tagline .user-username-component'));
  const usernamesInPage = usernameDivs.map(x => x.textContent.toLowerCase());
  const bothUsernamesLoaded = !usernamesInPage.includes('Opponent');
  const currentUserPlaying = usernamesInPage.includes(currentUsername.toLowerCase());

  if (!bothUsernamesLoaded || !currentUserPlaying) {
    return { cond: false, reason: 'username' };
  }
}

function isGameOver() {
  const gameOverModal = document.querySelector('.board-modal-container-container');
  const gameReviewBtn = document.querySelector('.game-review-buttons-component');
  const newGameBtns = document.querySelector('.new-game-buttons-component');
  const nextGameBtn = document.querySelector('.arena-footer-component > .cc-button-component');

  if (gameOverModal || gameReviewBtn || newGameBtns || nextGameBtn) {
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
 * - If return `{ cond: false, reason: string }`, unhide/do nothing depends on the case.
 * @returns {{cond: boolean, reason?: string}} whether all conditions to invoke `startHideOpponent()` are met.
 */
async function checkHideOpponentConds() {
  // 1. url condition
  // 2. username-related conditions
  // 3. game over-related conditions
  if (!window.location.href.match(/chess.com\/game\/(live\/)?\d+$/))
    return { cond: false, reason: 'url-not-match' };

  return usernameFail() || isGameOver() || { cond: true };
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
  const { hideRatings, hideOpponent, hideFlags, hideOwnFlagOnHome } = await browser.storage.local.get();

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

        if (hideOpponent && !usernameFail() && !isGameOver()) {
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

  if (hideFlags) {
    port.postMessage({ command: 'hideFlags' });
  }

  if (hideOwnFlagOnHome) {
    port.postMessage({ command: 'hideOwnFlagOnHome' });
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
});
