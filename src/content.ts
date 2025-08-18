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

const layoutObserver = new MutationObserver(() => isGameOver() ? addBtnToPlaces(port) : removeAllBtns());

function observeForAnalyzeOnLichess() {
  layoutObserver.observe(document.getElementById('board-layout-main')!, { subtree: true, childList: true });
  layoutObserver.observe(document.getElementById('board-layout-sidebar')!, { subtree: true, childList: true });
}

const wcBoardObserver = new MutationObserver((mutationList) => {
  // if not in analysis tab, return early
  if (!document.querySelector('.analysis-view-component')) {
    return;
  }

  if (isOptionsOpen())
    return;

  // filter out mutations
  const oneOrMorePiecesMoved = mutationList.some((mutation) => {
    if (mutation.target.nodeName === 'DIV') {
      // confirm a div
      const div = mutation.target as HTMLDivElement;

      if (div.classList.contains('piece')) {
        // confirm a piece

        if (!div.classList.contains('dragging')) {
          // confirm not a start-dragging mutation
          const squareRegex = /(?<=square-)\d{2}/;
          const oldSquare = mutation.oldValue && mutation.oldValue.match(squareRegex) ? mutation.oldValue.match(squareRegex)![0] : null;
          const newSquare = div.className.match(squareRegex)![0];

          if (oldSquare !== newSquare) {
            // confirm a piece moved (could be different piece due to line jumping)
            return true;
          }

          return false;
        }

        return false;
      }

      return false;
    }

    return false;
  });

  if (oneOrMorePiecesMoved) {
    renderOpeningExplorer();
  }
});

function startOpeningExplorer() {
  const analysisViewComp = document.querySelector('.analysis-view-component');
  if (!analysisViewComp)
    return;

  const wcBoard = document.getElementById('board-analysis-board');
  if (!wcBoard)
    return;

  port.postMessage({ command: 'openingExplorer' });
  renderOpeningExplorer();

  // observe() called multiple times doesnt duplicate the observer, so it's fine
  wcBoardObserver.observe(wcBoard, {
    subtree: true,
    attributes: true,
    attributeFilter: ['class'],
    attributeOldValue: true,
  });
}

const sidebarObserver = new MutationObserver(async (mutationList) => {
  // call startOpeningExplorer() when .analysis-view-component is subsequently added to DOM
  // (first-render case is handled by startOpeningExplorer itself)
  // 1. .analysis-view-component is added
  // 2. .sidebar-tab-content-component is added and it has .analysis-view-component inside (swiching tab from Review to Analysis)

  const analysisViewCompAdded = mutationList.some((mutation) => {
    if (mutation.addedNodes.length === 1
      && mutation.addedNodes.item(0)!.nodeName === 'DIV'
    ) {
      const addedDiv = mutation.addedNodes.item(0) as HTMLDivElement;

      if (addedDiv.classList.contains('analysis-view-component')) {
        return true;
      }

      if (addedDiv.classList.contains('sidebar-tab-content-component')
        && Array.from(addedDiv.children).some(div => div.classList.contains('analysis-view-component'))
      ) {
        return true;
      }
    }

    return false;
  });

  if (analysisViewCompAdded) {
    startOpeningExplorer();
  }
});

async function connectToBackground() {
  port = browser.runtime.connect({ name: 'my-content-script-port' });
  const { hideRatings, hideOpponent, hideFlags, hideOwnFlagOnHome, analyzeOnLichess, openingExplorer } = await browser.storage.local.get() as ExtStorage;

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
    // reminder: code in content script will be invoked every time file is saved in dev mode
    if (window.location.href.match(openingExplorerRegex)) {
      // 1. check for first appearance (observer can't catch)
      startOpeningExplorer();
      // 2. observing for subsequent appearances
      sidebarObserver.observe(document.getElementById('board-layout-sidebar')!, { childList: true, subtree: true });
    }
  }
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
        layoutObserver.disconnect();
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
        wcBoardObserver.disconnect();
      }
    }
  }
});
