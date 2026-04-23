import browser from 'webextension-polyfill';
import html from './html';

export const analyzeOnLichessClass = 'analyzeOnLichess';

function isFocusMode() {
  return document.body.classList.contains('theatre-mode');
}

/**
 * `options.variant`: `'default'` in sidebar | `'small'` in game over modal | `'icon'` in sidebar bottom
 * `options.className`: class from a sibling button to copy from
 * @returns A button that sends the game to Lichess analysis page
 */
function createAnalyzeOnLichessBtn(
  port: browser.Runtime.Port,
  options: {
    variant?: 'default' | 'small' | 'icon';
    className: string;
  },
) {
  let btn: HTMLElement;

  const defaultOptions = {
    variant: 'default',
  };

  const finalOptions = { ...defaultOptions, ...options };
  const { variant, className } = finalOptions;

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
    btn = html('button', {
      ariaLabel: 'Analyze on Lichess',
      title: 'Analyze on Lichess',
      className,
      style: { opacity: '0.5' },
      onmouseover: () => {
        btn.style.opacity = '0.82'; // sibling btns are 0.72, but this icon is thinner so make it more opaque to compensate
      },
      onmouseout: () => {
        btn.style.opacity = '0.5';
      },
    }, [
      html('img', {
        src: browser.runtime.getURL('../icons/SimpleIconsLichess.svg'),
        style: { width: '20px' },
      }),
    ]);
  }
  else {
    btn = html('a', {
      className,
      textContent: 'Analyze on Lichess',
      onclick: handleClick,
    });

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
      const icon = html('img', {
        src: browser.runtime.getURL('../icons/SimpleIconsLichess.svg'),
        style: { width: '24px' },
      });

      btn.prepend(icon);
    }
    else {
      // variant === 'small'
      btn.classList.add('game-over-primary-cta-game-over-primary-cta');
    }
  }

  btn.classList.add(analyzeOnLichessClass);

  return btn;
}

export function addBtnToPlaces(port: browser.Runtime.Port) {
  const gameReviewBtnGameOverModal = document.querySelector('.game-over-modal-shell-buttons > [aria-label=\'Game Review\']');
  const gameReviewBtnSidebar = document.querySelector('.sidebar-component .game-review-buttons-component > [aria-label=\'Game Review\']');
  const gameReviewBtnFocusModeSidebar = document.querySelector('.focus-mode-sidebar-bottom .game-review-buttons-component > [aria-label=\'Game Review\']');
  const liveGameAnalysisBtn = document.querySelector('.live-game-buttons-component > [aria-label="Self Analysis"],.game-icons-container-component > [aria-label="Self Analysis"]');

  if (gameReviewBtnGameOverModal && !gameReviewBtnGameOverModal.parentElement!.querySelector(`.${analyzeOnLichessClass}`)) {
    gameReviewBtnGameOverModal.insertAdjacentElement('beforebegin', createAnalyzeOnLichessBtn(port, {
      variant: 'small',
      className: gameReviewBtnGameOverModal.className,
    }));
  }

  if (gameReviewBtnSidebar && !gameReviewBtnSidebar.parentElement!.querySelector(`.${analyzeOnLichessClass}`)) {
    gameReviewBtnSidebar.insertAdjacentElement('beforebegin', createAnalyzeOnLichessBtn(port, {
      className: gameReviewBtnSidebar.className,
    }));
  }

  if (gameReviewBtnFocusModeSidebar && !gameReviewBtnFocusModeSidebar.parentElement!.querySelector(`.${analyzeOnLichessClass}`)) {
    gameReviewBtnFocusModeSidebar.insertAdjacentElement('beforebegin', createAnalyzeOnLichessBtn(port, {
      className: gameReviewBtnFocusModeSidebar.className,
    }));
  }

  if (liveGameAnalysisBtn && !liveGameAnalysisBtn.parentElement!.querySelector(`.${analyzeOnLichessClass}`)) {
    liveGameAnalysisBtn.insertAdjacentElement('afterend', createAnalyzeOnLichessBtn(port, {
      variant: 'icon',
      className: liveGameAnalysisBtn.className,
    }));
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
