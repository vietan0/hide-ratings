import browser from 'webextension-polyfill';

export const analyzeOnLichessClass = 'analyzeOnLichess';

/**
 * @returns A button that sends the game to Lichess analysis page
 */
function createAnalyzeOnLichessBtn(port: browser.Runtime.Port, variant: 'default' | 'small' | 'icon' = 'default') {
  let btn: HTMLAnchorElement | HTMLButtonElement;

  function handleClick() {
    const focusMode = document.body.classList.contains('theatre-mode');

    if (focusMode) {
      // get out of focus mode
      const minimizeBtn = document.querySelector<HTMLButtonElement>('.board-layout-icon.icon-font-chess.minimize')!;
      minimizeBtn.click();
    }

    const shareBtn = document.querySelector<HTMLButtonElement>('.live-game-buttons-component > [aria-label="Share"],.game-icons-container-component > [aria-label="Share"]')!;

    shareBtn.click();

    const startTrying = Date.now();

    const pgnTabBtnInterval = setInterval(() => {
      // 'polling' for the btn every 100ms
      const pgnTabBtn = document.getElementById('tab-pgn');

      if (pgnTabBtn) {
        pgnTabBtn.click();
        const textarea = document.querySelector<HTMLTextAreaElement>('.share-menu-tab-pgn-pgn-wrapper > textarea')!;

        if (textarea) {
          clearInterval(pgnTabBtnInterval);
          const pgn = textarea.value;
          const closeBtn = document.querySelector<HTMLButtonElement>('#share-modal [aria-label="Close"]');
          closeBtn!.click();
          port.postMessage({ command: 'openLichessTab', pgn });

          return;
        }
      }

      const timeout = 4000;

      if (Date.now() - startTrying > timeout) {
        clearInterval(pgnTabBtnInterval);
        console.error(`Unable to find pgnTabBtn after ${timeout / 1000} seconds`);
      }
    }, 100);
  }

  if (variant === 'icon') {
    btn = document.createElement('button');
    btn.ariaLabel = 'Analyze on Lichess';

    btn.style = `
            border: none;
            background-color: transparent;
            opacity: 0.5;
          `;

    btn.addEventListener('mouseover', () => {
      btn.style.opacity = '0.82'; // sibling btns are 0.72, but this one is thinner so make it more opaque to compensate
    });

    btn.addEventListener('mouseout', () => {
      btn.style.opacity = '0.5';
    });

    const icon = document.createElement('img');
    icon.src = browser.runtime.getURL('../icons/SimpleIconsLichess.svg');
    icon.style = 'width: 20px';
    btn.append(icon);
  }
  else {
    btn = document.createElement('a');
    btn.className = 'cc-button-component cc-button-primary cc-button-xx-large cc-bg-primary cc-button-full';
    btn.textContent = 'Analyze on Lichess';

    btn.style = `
            --fontSize: 1.8rem;
            --bgColor: #383634;
            --bgColorHover: #474542;
            --borderBottomLine: #2b2a28;
            --buttonBoxShadowHover: rgba(40, 40, 40, 0.2) 0px 0px 8px 0px, rgba(40, 40, 40, 0.2) 0px 0px 16px 0px, rgba(40, 40, 40, 0.5) 0px -8px 24px 0px inset, rgb(40, 40, 40) 0px -4px 0px 0px inset;
          `;

    if (variant === 'default') {
      const icon = document.createElement('img');
      icon.src = browser.runtime.getURL('../icons/SimpleIconsLichess.svg');
      icon.style = 'width: 24px';
      btn.prepend(icon);
    }
    else {
      // variant === 'small'
      btn.classList.add('game-over-review-button-game-over-review-button');
    }
  }

  btn.onclick = handleClick;
  btn.classList.add(analyzeOnLichessClass);

  return btn;
}

export function addBtnToPlaces(port: browser.Runtime.Port) {
  const gameOverModalBtns = document.querySelector('.game-over-modal-buttons');
  const gameReviewBtnSidebar = document.querySelector('.sidebar-component .game-review-buttons-component');
  const focusModeSidebarBottom = document.querySelector('.focus-mode-sidebar-bottom');
  const liveGameAnalysisBtn = document.querySelector('.live-game-buttons-component > [aria-label="Self Analysis"],.game-icons-container-component > [aria-label="Self Analysis"]');

  if (gameOverModalBtns && !gameOverModalBtns.querySelector(`.${analyzeOnLichessClass}`)) {
    gameOverModalBtns.prepend(createAnalyzeOnLichessBtn(port, 'small'));
  }

  if (gameReviewBtnSidebar && !gameReviewBtnSidebar.parentElement!.querySelector(`.${analyzeOnLichessClass}`)) {
    gameReviewBtnSidebar.insertAdjacentElement('afterbegin', createAnalyzeOnLichessBtn(port));
  }

  if (focusModeSidebarBottom && !focusModeSidebarBottom.querySelector(`.${analyzeOnLichessClass}`)) {
    focusModeSidebarBottom.prepend(createAnalyzeOnLichessBtn(port));
  }

  if (liveGameAnalysisBtn && !liveGameAnalysisBtn.parentElement!.querySelector(`.${analyzeOnLichessClass}`)) {
    liveGameAnalysisBtn.insertAdjacentElement('afterend', createAnalyzeOnLichessBtn(port, 'icon'));
  }
}

export function removeAllBtns() {
  const allBtns = document.getElementsByClassName(analyzeOnLichessClass);

  for (const btn of Array.from(allBtns)) {
    btn.remove();
  }
}

// details: https://regexr.com/8gbu9
export const analyzeOnLichessRegex = /chess.com\/(?:game\/(?:live|daily)?\/?\d+|play\/online)/;
