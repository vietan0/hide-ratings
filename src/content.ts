import browser from 'webextension-polyfill';
import { addBtnToPlaces, analyzeOnLichessRegex, removeAllBtns } from './analyzeOnLichess';
import isGameOver from './isGameOver';
import { isOptionsOpen, openingExplorerId, openingExplorerRegex, renderOpeningExplorer } from './openingExplorer';
import type { ExtStorage } from './storageTypes';
import { checkHideOpponentConds, hideOpponentRegex, hideOrUnhide, startHideOpponent, stopHideOpponent } from './hideOpponent';
import { addAnalysisLinks, analysisLinkInArchiveRegex, removeAnalysisLinks } from './analysisLinkInArchive';

let port: browser.Runtime.Port;

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
          if (mutation.oldValue === null)
            return false;

          const oldSquareMatches = mutation.oldValue.match(squareRegex);
          const newSquareMatches = div.className.match(squareRegex);
          if (!oldSquareMatches || !newSquareMatches)
            return false;

          const oldSquare = oldSquareMatches[0];
          const newSquare = newSquareMatches[0];

          if (oldSquare !== newSquare) {
            // confirm a piece moved (could be different piece due to line jumping)
            // can catch Promotion No Capture moves
            return true;
          }
          else {
            const pieceRegex = /[wb]\w/;
            const oldPieceMatches = mutation.oldValue.match(pieceRegex);
            const newPieceMatches = div.className.match(pieceRegex);
            if (!oldPieceMatches || !newPieceMatches)
              return false;

            const oldPiece = oldPieceMatches[0];
            const newPiece = newPieceMatches[0];

            if (oldPiece !== newPiece) {
              // confirm a Clicking On A Capture Move From The Engine Line
              // can catch Promotion Capture moves
              return true;
            }

            return false;
          }
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

const archiveObserver = new MutationObserver((mutationList) => {
  for (const mutation of mutationList) {
    if (mutation.addedNodes.length > 0) {
      if (mutation.target.nodeType === 1) {
        const target = mutation.target as Element;

        if (window.location.href.match(/chess.com\/member\/[\w-]+$/)) {
          if (target.classList.contains('archive-component')) {
            const firstAddedNode = mutation.addedNodes.item(0)!;

            if (firstAddedNode.nodeType === 1
              && (firstAddedNode as HTMLElement).getAttribute('header-title')! === 'Game History'
            ) {
              // 1. visit /member/x
              addAnalysisLinks();

              return;
            }
          }
        }

        if (target.id === 'profile-main') {
          // 1. visit /member/x/games
          // 2. visit /member/x/stats/bullet
          // 3. in /member/x/games and switch tab between Overview to Games
          const archiveTable = document.querySelector('.archive-table');

          if (!archiveTable) {
            addAnalysisLinks();

            return;
          }
        }

        if (target.classList.contains('archive-header-header')) {
          // 1. in /member/x/games and switch tab between Recent-Daily-Live-Bot and either the fromTab or toTab has 0 games
          addAnalysisLinks();

          return;
        }

        if (target.tagName === 'TBODY') {
          // 1. visit /home
          // 2. in /member/x/games and switch tab between Recent-Daily-Live-Bot and both fromTab or toTab has games
          // 3. switch from /member/x/stats/[A to B]
          addAnalysisLinks();

          return;
        }

        else if (window.location.href.match(/chess.com\/games\/archive/)) {
          // https://www.chess.com/games/archive
          // should already get added by first page load
          archiveObserver.disconnect();
        }
      }
    }
  }
});

function startAnalysisLinkInArchive() {
  port.postMessage({ command: 'analysisLinkInArchive' });
  addAnalysisLinks();
  const main = document.querySelector('main.layout-component')!;
  archiveObserver.observe(main, { childList: true, subtree: true });
}

let retryCount = 0;

async function content() {
  try {
    const {
      hideRatings,
      hideOpponent,
      hideFlags,
      hideOwnFlagOnHome,
      analyzeOnLichess,
      openingExplorer,
      analysisLinkInArchive,
    } = await browser.storage.local.get() as ExtStorage;

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
        startOpeningExplorer();
        sidebarObserver.observe(document.getElementById('board-layout-sidebar')!, { childList: true, subtree: true });
      }
    }

    if (analysisLinkInArchive) {
      if (window.location.href.match(analysisLinkInArchiveRegex)) {
        startAnalysisLinkInArchive();
      }
    }
  }
  catch (err) {
    if ((err as Error).message === 'An unexpected error occurred') {
      /* chess.com's weird error that can interrupt content script. Retry up to 5 times. */
      if (retryCount <= 5) {
        setTimeout(() => {
          content();
          retryCount++;
        }, 500);
      }
    }
  }
}

function connect() {
  port = browser.runtime.connect({ name: 'my-content-script-port' });

  port.onDisconnect.addListener(() => {
    connect();
  });
}

window.addEventListener('pageshow', async (event) => {
  if (event.persisted) {
    // The page is restored from BFCache, set up a new connection.
    connect();

    const { analyzeOnLichess } = await browser.storage.local.get() as ExtStorage;

    if (analyzeOnLichess) {
      if (window.location.href.match(analyzeOnLichessRegex)) {
        if (isGameOver()) {
          // replace buttons, because port is stale -> onclick handlers wouldn't work
          removeAllBtns();
          addBtnToPlaces(port);
        }
      }
    }
  }
});

connect();
content();

browser.storage.local.onChanged.addListener(async (changes) => {
  const entries = Object.entries(changes) as [keyof ExtStorage, browser.Storage.StorageChange][];
  const [changedKey, { newValue }] = entries[0]!;

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

  else if (changedKey === 'analyzeOnLichess') {
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

  else if (changedKey === 'openingExplorer') {
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

  else if (changedKey === 'analysisLinkInArchive') {
    if (newValue) {
      if (window.location.href.match(analysisLinkInArchiveRegex)) {
        startAnalysisLinkInArchive();
      }
    }
    else {
      port.postMessage({ command: 'hideAnalysisLinkInArchive' });
      removeAnalysisLinks();
      archiveObserver.disconnect();
    }
  }
});
