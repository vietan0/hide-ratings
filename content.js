import { overrideImg, restoreImg } from './changeImg';

/**
 * This storage listener must be added here, in content script,
 * because I need tabId, which is not a property if sent from popup's script.
 */
function notifyBackground(changes) {
  const [changedFeature] = Object.keys(changes);

  browser.runtime.sendMessage({
    feature: changedFeature,
    newValue: changes[changedFeature].newValue,
    url: window.location.href, // because sender.url isn't reliably up-to-date
  });
}

browser.storage.local.onChanged.addListener(notifyBackground);

/**
 * @type {[string, string]}
 */
let usernamesInPage = [];

/**
 * Observe 2 player divs on top/bottom of the board,
 * keep the latest values in variable `usernamesInPage`,
 * which will be sent to background whenever background requests,
 * to determine whether hide opponent code should be run.
 */
function observeUserBlocks() {
  const userInfoDivs = Array.from(document.getElementsByClassName('player-component'));

  const observer = new MutationObserver((mutationList) => {
    for (const mutation of mutationList) {
      const usernameDivs = Array.from(document.querySelectorAll('.player-tagline .cc-user-username-component'));

      // filter out mutations that doesn't have one of usernameDivs as target or added node/removed node
      if (mutation.target.contains(usernameDivs[0])
        || mutation.target.contains(usernameDivs[1])
      ) {
        if (usernameDivs.length === 2
          && !usernameDivs.some(div => div.textContent === 'Opponent')
        ) {
          usernamesInPage = usernameDivs.map(x => x.textContent);
        }
      }
    }
  });

  for (const div of userInfoDivs) {
    observer.observe(div, { characterData: true, subtree: true, childList: true });
  }
}

observeUserBlocks();

/**
 * Observe the board, send `game-over` message to background whenever the Game Over modal pops up.
 */
function observeBoard() {
  const board = document.getElementById('board-layout-chessboard');
  if (!board)
    return;

  const observer = new MutationObserver((mutationList) => {
    for (const mutation of mutationList) {
      const newNode = mutation.addedNodes.item(0);

      if (
        newNode
        && newNode.classList
        && newNode.classList.contains('board-modal-container-container')
      ) {
        return browser.runtime.sendMessage('game-over');
      }
    }
  });

  observer.observe(board, { childList: true });
}

observeBoard();

browser.runtime.onMessage.addListener((message) => {
  if (message === 'search-for-username') {
    // confirmed: live game URL, hideOpponent is true, usernames in storage isn't empty
    const gameReviewBtn = document.querySelector('.game-review-buttons-component');
    const gameResultSpan = document.querySelector('.game-result');

    return Promise.resolve({ usernamesInPage, gameReviewBtn, gameResultSpan });
  }

  if (message === 'hide') {
    overrideImg();
  }

  if (message === 'unhide') {
    restoreImg();
  }
});
