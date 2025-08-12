import { overrideImg, placeholderImgId, restoreImg } from './changeImg';
import { overrideUsername, placeholderUsername, restoreUsername } from './changeUsername';
import { addBtnToPlaces, analyzeOnLichessRegex, removeAllBtns } from './analyzeOnLichess';
import isGameOver from './isGameOver';
import { fetchAndRender, isOptionsOpen, openingExplorerId } from './openingExplorer';
import { type ExtStorage, isFeatureId } from './storageTypes';

let port: browser.runtime.Port;

function usernameFail() {
  const currentUsername = document.getElementById('notifications-request')!.getAttribute('username')!;
  const usernameDivs = Array.from(document.querySelectorAll<HTMLDivElement>('.player-tagline .cc-user-username-component, .player-tagline .user-username-component'));
  const usernamesInPage = usernameDivs.map(x => x.textContent!.toLowerCase());
  const bothUsernamesLoaded = !usernamesInPage.includes('opponent');
  const currentUserPlaying = usernamesInPage.includes(currentUsername.toLowerCase());

  if (!bothUsernamesLoaded || !currentUserPlaying) {
    return { cond: false, reason: 'username' } as const;
  }
}

function hideOpponentInEffect() {
  const placeholderImg = document.getElementById(placeholderImgId);
  const placeholderUsernameDiv = document.getElementById(placeholderUsername);

  return Boolean(placeholderImg || placeholderUsernameDiv);
}

// details: https://regexr.com/8gcck
const hideOpponentRegex = /chess.com\/(?:game\/(?:live|daily\/)?\d+$|play\/online\/new)/;
const openingExplorerRegex = /chess.com\/analysis/;

/**
 * - This function doesn't check for storage's `hideOpponent` and should only be called when it's already `true`.
 * - This function doesn't check if hideOpponent code is already in effect (avatar & username replaced)
 * - If return `{ cond: true }`, proceed to hide opponent.
 * - If return `{ cond: false, reason: string }`, unhide/do nothing depends on the case.
 * @returns whether all conditions to invoke `startHideOpponent()` are met.
 */
function checkHideOpponentConds() {
  // 1. url condition
  // 2. username-related conditions
  // 3. game over-related conditions
  if (!window.location.href.match(hideOpponentRegex))
    return { cond: false, reason: 'url' } as const;

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
    const { hideOpponent } = await browser.storage.local.get() as ExtStorage;

    if (hideOpponent) {
      if (checkHideOpponentConds().cond) {
        startHideOpponent();
      }
    }
  }
}

const topPlayerCompObserver = new MutationObserver(async (mutationList) => {
  const topUserBlock = document.querySelector('.cc-user-block-component, .user-tagline-compact-theatre');
  if (!topUserBlock)
    return;

  const focusModeWasToggled = mutationList.some(m =>
    m.type === 'attributes'
    && m.attributeName === 'class'
    && m.oldValue
    && m.oldValue.includes('player-component player-top'),
  );

  if (focusModeWasToggled) {
    hideOrUnhide();
  }

  else if (mutationList.some(m => m.target.contains(topUserBlock) || topUserBlock.contains(m.target))) {
    hideOrUnhide();
  }
});

const boardObserver = new MutationObserver(() => isGameOver() ? addBtnToPlaces(port) : removeAllBtns());

const analysisViewLinesObserver = new MutationObserver(() => {
  if (!isOptionsOpen())
    fetchAndRender();
});

function observeForAnalyzeOnLichess() {
  boardObserver.observe(document.getElementById('board-layout-main')!, { subtree: true, childList: true });
  boardObserver.observe(document.getElementById('board-layout-sidebar')!, { subtree: true, childList: true });
}

async function connectToBackground() {
  port = browser.runtime.connect({ name: 'my-content-script-port' });
  const { hideRatings, hideOpponent, hideFlags, hideOwnFlagOnHome, analyzeOnLichess, openingExplorer } = await browser.storage.local.get() as ExtStorage;

  // 1. page loads, check storage to see what to execute
  if (hideRatings) {
    port.postMessage({ command: 'hideRatings' });
  }

  if (hideOpponent) {
    const topPlayerComp = document.querySelector('.player-component.player-top');

    if (topPlayerComp) {
      hideOrUnhide();

      topPlayerCompObserver.observe(topPlayerComp, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['class'],
        attributeOldValue: true,
      });
    }
  }

  if (hideFlags) {
    port.postMessage({ command: 'hideFlags' });
  }

  if (hideOwnFlagOnHome) {
    port.postMessage({ command: 'hideOwnFlagOnHome' });
  }

  if (analyzeOnLichess) {
    if (window.location.href.match(analyzeOnLichessRegex)) {
      observeForAnalyzeOnLichess();
    }
  }

  if (openingExplorer) {
    if (window.location.href.match(openingExplorerRegex)) {
      const bodyObserver = new MutationObserver(async () => {
        const analysisViewLines = document.querySelector('.analysis-view-lines');

        if (analysisViewLines) {
          port.postMessage({ command: 'openingExplorer' });
          fetchAndRender();
          analysisViewLinesObserver.observe(analysisViewLines, { attributes: true, attributeFilter: ['fen'] });
          bodyObserver.disconnect();
        }
      });

      if (document.getElementById(openingExplorerId)) {
        // when content script re-loaded, but already injected
        // needed in dev
        port.postMessage({ command: 'openingExplorer' });
        fetchAndRender();
        analysisViewLinesObserver.observe(document.querySelector('.analysis-view-lines')!, { attributes: true, attributeFilter: ['fen'] });

        return;
      }

      bodyObserver.observe(document.body, { childList: true, subtree: true });
    }
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
  const entries = Object.entries(changes) as [keyof ExtStorage, browser.storage.StorageChange][];
  const [changedKey, { newValue }] = entries[0]!;

  if (isFeatureId(changedKey)) {
    if (changedKey === 'hideOpponent') {
      if (newValue) {
        if (window.location.href.match(hideOpponentRegex)) {
          topPlayerCompObserver.observe(document.querySelector('.player-component.player-top')!, {
            subtree: true,
            childList: true,
            attributes: true,
            attributeFilter: ['class'],
            attributeOldValue: true,
          });

          if (checkHideOpponentConds().cond) {
            startHideOpponent();
          }
        }
      }
      else {
        stopHideOpponent();
        topPlayerCompObserver.disconnect();
      }
    }

    if (changedKey === 'analyzeOnLichess') {
      if (newValue) {
        if (window.location.href.match(analyzeOnLichessRegex)) {
          observeForAnalyzeOnLichess();

          if (isGameOver()) {
            addBtnToPlaces(port);
          }
        }
      }
      else {
        removeAllBtns();
        boardObserver.disconnect();
      }
    }

    if (changedKey === 'openingExplorer') {
      if (newValue) {
        if (window.location.href.match(openingExplorerRegex)) {
          fetchAndRender();
          const analysisViewLines = document.querySelector('.analysis-view-lines')!;
          analysisViewLinesObserver.observe(analysisViewLines, { attributes: true, attributeFilter: ['fen'] });
        }
      }
      else {
        document.getElementById(openingExplorerId)?.remove();
        analysisViewLinesObserver.disconnect();
      }
    }
  }
});
