import { addBtnToPlaces, analyzeOnLichessRegex, removeAllBtns } from './analyzeOnLichess';
import isGameOver from './isGameOver';
import { isOptionsOpen, openingExplorerId, openingExplorerRegex, renderOpeningExplorer } from './openingExplorer';
import { type ExtStorage, isFeatureId } from './storageTypes';
import { checkHideOpponentConds, hideOpponentRegex, hideOrUnhide, startHideOpponent, stopHideOpponent } from './hideOpponent';

let port: browser.runtime.Port;

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
    hideOrUnhide(port);
  }

  else if (mutationList.some(m => m.target.contains(topUserBlock) || topUserBlock.contains(m.target))) {
    hideOrUnhide(port);
  }
});

const boardObserver = new MutationObserver(() => isGameOver() ? addBtnToPlaces(port) : removeAllBtns());

function observeForAnalyzeOnLichess() {
  boardObserver.observe(document.getElementById('board-layout-main')!, { subtree: true, childList: true });
  boardObserver.observe(document.getElementById('board-layout-sidebar')!, { subtree: true, childList: true });
}

const analysisViewLinesObserver = new MutationObserver(() => {
  if (!isOptionsOpen())
    renderOpeningExplorer();
});

function startOpeningExplorer() {
  const analysisViewLines = document.querySelector('.analysis-view-lines');

  if (!analysisViewLines)
    return;

  port.postMessage({ command: 'openingExplorer' });
  renderOpeningExplorer();
  analysisViewLinesObserver.observe(analysisViewLines, { attributes: true, attributeFilter: ['fen'] });
}

const sidebarObserver = new MutationObserver(async (mutationList) => {
  // only startOpeningExplorer when either:
  // 1. .analysis-view-lines is added
  // 2. .analysis-view-component is added and it has .analysis-view-lines inside
  const analysisViewLinesAdded = mutationList.some((mutation) => {
    if (mutation.addedNodes.length === 1
      && mutation.addedNodes.item(0)!.nodeType === 1
      && mutation.addedNodes.item(0)!.nodeName === 'DIV'
    ) {
      const addedDiv = mutation.addedNodes.item(0) as HTMLDivElement;
      if (addedDiv.classList.contains('analysis-view-lines'))
        return true;

      if (addedDiv.classList.contains('analysis-view-component')
        && Array.from(addedDiv.children).some(div => div.classList.contains('analysis-view-lines'))
      ) {
        return true;
      }
    }

    return false;
  });

  if (analysisViewLinesAdded) {
    startOpeningExplorer();
  }
});

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
      hideOrUnhide(port);

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
      sidebarObserver.observe(document.getElementById('board-layout-sidebar')!, { childList: true, subtree: true });

      if (document.getElementById(openingExplorerId)) {
        // when content script re-loaded, but already injected
        // needed in dev
        startOpeningExplorer();
      }
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
            startHideOpponent(port);
          }
        }
      }
      else {
        stopHideOpponent(port);
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
          startOpeningExplorer();
          sidebarObserver.observe(document.getElementById('board-layout-sidebar')!, { childList: true, subtree: true });
        }
      }
      else {
        port.postMessage({ command: 'hideOpeningExplorer' });
        document.getElementById(openingExplorerId)?.remove();
        sidebarObserver.disconnect();
        analysisViewLinesObserver.disconnect();
      }
    }
  }
});
