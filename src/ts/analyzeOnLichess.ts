import browser from 'webextension-polyfill';

export const analyzeOnLichessClass = 'analyzeOnLichess';

function isFocusMode() {
  return document.body.classList.contains('theatre-mode');
}

/**
 * @returns A button that sends the game to Lichess analysis page
 */
function createAnalyzeOnLichessBtn(port: browser.Runtime.Port, variant: 'default' | 'small' | 'icon' = 'default') {
  let btn: HTMLAnchorElement | HTMLButtonElement;

  function handleClick() {
    let fromFocusMode = false;
    if (isFocusMode()) {
      // get out of focus mode
      fromFocusMode = true;
      const focusModeToggleBtn = document.getElementById('board-controls-focus')!;
      focusModeToggleBtn.click();
    }
    
    const timeout = 4000;
    const delay = 100;
    const startFindingShareBtn = Date.now();

    const shareBtnInterval = setInterval(() => {
      const shareBtn = document.querySelector<HTMLButtonElement>('.live-game-buttons-component > [aria-label="Share"],.game-icons-container-component > [aria-label="Share"]');

      if (shareBtn) {
        shareBtn.click();
        clearInterval(shareBtnInterval);

        const startFindingPgnTabBtn = Date.now();

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

              if (fromFocusMode) {
                const focusModeToggleBtn = document.getElementById('board-controls-focus')!;
                focusModeToggleBtn.click();
              }

              port.postMessage({ command: 'openLichessTab', pgn });

              return;
            }
          }

          if (Date.now() - startFindingPgnTabBtn > timeout) {
            clearInterval(pgnTabBtnInterval);
            console.error(`Unable to find pgnTabBtn after ${timeout / 1000} seconds`);
          }
        }, delay);
      }
      
      if (Date.now() - startFindingShareBtn > timeout) {
        clearInterval(shareBtnInterval);
        console.error(`Unable to find shareBtn after ${timeout / 1000} seconds`);
      }
    }, delay);
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
    btn.className = 'cc-button-component cc-button-primary cc-button-xx-large cc-bg-primary';
    btn.textContent = 'Analyze on Lichess';
    
    btn.style = `
      --cc-bg-color: linear-gradient(
        180deg,
        var(--color-gray-700) 0%,
        var(--color-gray-800) 100%
      );
      --cc-bg-color-hover:
        linear-gradient(
          180deg,
          color-mix(in srgb, var(--color-gray-600), transparent 50%) 0%,
          transparent 100%
        ),
        linear-gradient(
          180deg,
          var(--color-gray-700) 0%,
          var(--color-gray-800) 100%
        );
      --cc-bg-box-shadow:
        inset 0 0.1rem 0 0
          color-mix(in srgb, var(--color-gray-600), transparent 60%),
        inset 0 -0.1rem 0 0 var(--color-gray-900),
        inset 0 0.2rem 0.4rem 0
          color-mix(in srgb, var(--color-gray-600), transparent 50%),
        inset 0 -0.2rem 0.4rem 0
          color-mix(in srgb, var(--color-gray-900), transparent 50%),
        0 0.1rem 0.2rem 0 var(--color-transparent-black-14),
        0 0.2rem 0.4rem 0 var(--color-transparent-black-10);
      --cc-bg-box-shadow-hover:
        inset 0 0.1rem 0 0
          color-mix(in srgb, var(--color-gray-500), transparent 60%),
        inset 0 0.2rem 0.4rem 0
          color-mix(in srgb, var(--color-gray-600), transparent 50%),
        inset 0 -0.1rem 0 0 var(--color-gray-900),
        inset 0 -0.2rem 0.4rem 0
          color-mix(in srgb, var(--color-gray-900), transparent 50%),
        0 0.1rem 0.2rem 0 var(--color-transparent-black-14),
        0 0.2rem 0.4rem 0 var(--color-transparent-black-10);
    `;

    if (variant === 'default') {
      const icon = document.createElement('img');
      icon.src = browser.runtime.getURL('../icons/SimpleIconsLichess.svg');
      icon.style = 'width: 24px';
      btn.prepend(icon);

      if (isFocusMode()) {
        btn.classList.add('game-over-review-button-game-over-review-button');
      }
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
