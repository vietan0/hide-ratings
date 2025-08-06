export const analyzeOnLichessClass = 'analyzeOnLichess';

/**
 * @returns A button that sends the game to Lichess analysis page
 */
export function createAnalyzeOnLichessBtn(port: browser.runtime.Port, variant: 'default' | 'small' | 'icon' = 'default') {
  let btn: HTMLDivElement | HTMLButtonElement;

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

      if (Date.now() - startTrying > 2000) {
        clearInterval(pgnTabBtnInterval);
        console.error('Unable to find pgnTabBtn after 2 seconds');
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
    icon.src = browser.runtime.getURL('src/icons/SimpleIconsLichess.svg');
    icon.style = 'width: 20px';
    btn.append(icon);
  }
  else {
    btn = document.createElement('div');
    const anchor = document.createElement('a');
    btn.append(anchor);
    const span = document.createElement('span');
    span.textContent = 'Analyze on Lichess';

    if (variant === 'default') {
      btn.className = 'game-review-buttons-component';
      btn.style = 'margin-bottom: 0.5rem;';

      anchor.className = 'cc-button-component cc-button-primary cc-button-xx-large cc-bg-primary cc-button-full';

      anchor.style = `
            --fontSize: 1.8rem;
            --bgColor: #383634;
            --bgColorHover: #474542;
            --borderBottomLine: #2b2a28;
            --borderBottomLineHover: #2e2d2b;
            --buttonBoxShadowHover: rgba(40, 40, 40, 0.2) 0px 0px 8px 0px, rgba(40, 40, 40, 0.2) 0px 0px 16px 0px, rgba(40, 40, 40, 0.5) 0px -8px 24px 0px inset, rgb(40, 40, 40) 0px -4px 0px 0px inset;
          `;

      span.className = 'cc-button-one-line';
      const icon = document.createElement('img');
      icon.src = browser.runtime.getURL('src/icons/SimpleIconsLichess.svg');
      icon.style = 'width: 24px';
      anchor.append(icon);
      anchor.append(span);
    }
    else {
      // variant === 'small'
      btn.className = 'quick-analysis-loader-component';
      anchor.className = 'cc-button-component cc-button-primary cc-button-xx-large cc-bg-primary cc-button-full quick-analysis-loader-background';

      anchor.style = `
            width: 100%;
            --bgColor: #383634;
            --bgColorHover: #474542;
            --buttonBoxShadowHover: rgba(40, 40, 40, 0.2) 0px 0px 8px 0px, rgba(40, 40, 40, 0.2) 0px 0px 16px 0px, rgba(40, 40, 40, 0.5) 0px -8px 24px 0px inset, rgb(40, 40, 40) 0px -4px 0px 0px inset;
          `;

      span.className = 'quick-analysis-loader-label';
      btn.append(span);
    }
  }

  btn.onclick = handleClick;
  btn.classList.add(analyzeOnLichessClass);

  return btn;
}

export function addBtnToPlaces(port: browser.runtime.Port) {
  const gameOverModalBtns = document.querySelector('.game-over-modal-buttons');
  const gameReviewBtnSidebar = document.querySelector('.sidebar-component .game-review-buttons-component');
  const focusModeSidebarBottom = document.querySelector('.focus-mode-sidebar-bottom');
  const liveGameAnalysisBtn = document.querySelector('.live-game-buttons-component > [aria-label="Self Analysis"],.game-icons-container-component > [aria-label="Self Analysis"]');

  if (gameOverModalBtns && !gameOverModalBtns.querySelector(`.${analyzeOnLichessClass}`)) {
    gameOverModalBtns.prepend(createAnalyzeOnLichessBtn(port, 'small'));
  }

  if (gameReviewBtnSidebar && !gameReviewBtnSidebar.parentElement!.querySelector(`.${analyzeOnLichessClass}`)) {
    gameReviewBtnSidebar.insertAdjacentElement('beforebegin', createAnalyzeOnLichessBtn(port));
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
