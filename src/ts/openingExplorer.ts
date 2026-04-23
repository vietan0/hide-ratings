import type { ExtStorage, Rating, TimeControl } from './storageTypes';
import { debounce } from 'es-toolkit';
import browser from 'webextension-polyfill';
import capitalize from './capitalize';
import getFenFromUrl from './getFenFromUrl';
import html from './html';
import maxDepthReached from './maxDepthReached';
import { port } from './port';
import { ratings, timeControls } from './storageTypes';
import svg from './svg';

type Opening = {
  eco: string;
  name: string;
} | null;

interface Move {
  uci: string;
  san: string;
  averageRating: number;
  white: number;
  draws: number;
  black: number;
  game: null;
  opening: Opening;
}

interface LiRes {
  white: number;
  draws: number;
  black: number;
  moves: Move[];
  recentGames?: [];
  topGames: [];
  opening: Opening;
}

export const openingExplorerId = 'openingExplorer';
export const contentId = 'content';
const optionsId = 'options';
const headerId = 'header';
const overlayClass = 'overlay';
const loadingId = 'loading';
const cache = new Map<string, LiRes>();
let fen = '';
let liRes: LiRes | undefined | null; // undefined when fetch() fails, null when maxDepthReached
const wait = 400;
let timeoutId: NodeJS.Timeout | undefined;

function addOverlay() {
  const overlay = html('div', { className: overlayClass });
  const openingExplorer = document.getElementById(openingExplorerId);

  if (openingExplorer && document.getElementsByClassName(overlayClass).length === 0) {
    openingExplorer.append(overlay);
  }
}

function removeOverlay() {
  for (const div of document.getElementsByClassName(overlayClass)) {
    div.remove();
  }
}

export function isOptionsOpen() {
  const openingExplorer = document.getElementById(openingExplorerId);

  return openingExplorer && openingExplorer!.dataset.isOptionsOpen === 'true';
}

async function fetchLichess(url: string) {
  if (!port.addedLichessListener) {
    port.onMessage.addListener((message: any) => {
      if (message.command === 'lichessResult') {
        const { url, result } = message;

        if (result === 'Authorization Required') {
          updateLiResAndInsertContent(undefined); // result itself should be undefined, or a more descriptive msg?
        }

        else {
          cache.set(url, result);

          if (timeoutId) {
            updateLiResAndInsertContent(result);
          }
          else {
            // timeoutId is undefined when invoked -> called after the wait period ends -> trailing-edge confirmed
            // Bug: when a streak of debounced calls ends in a position with a cached liRes (e.g. quickly ArrowLeft and ArrowRight before stopping on a visited position), but then the trailing-edge fetch changes liRes one last time, making liRes one/few moves ahead of the current board
            // Solution: When it's a trailing-edge invocation, only change liRes if fen in url match fen on board, ignore if not.
            if (getFenFromUrl(url) === fen) {
              updateLiResAndInsertContent(result);
            }
          }
        }
      }
    });

    port.addedLichessListener = true;
  }

  port.postMessage({ command: 'fetchLichess', url });
}

/**
 * Return a version of `debouncedFn` that will
 * - Add overlay (if there isn't one) on every invocation.
 * - Give access to the timer of the debounced function.
 */
function timeDebounced<T extends (...args: any) => any>(debouncedFn: T) {
  return async function (this: any, ...args: Parameters<T>) {
    clearTimeout(timeoutId);
    addOverlay();

    timeoutId = setTimeout(() => {
      timeoutId = undefined;
    }, wait);

    await debouncedFn.call(this, ...args);
  };
}

const timeDebouncedFetchLichess = timeDebounced(debounce(fetchLichess, wait, { edges: ['leading', 'trailing'] }));

async function renderHeader() {
  async function renderTabs() {
    const tabs = html('div', { id: 'tabs' });
    const { database } = await browser.storage.local.get() as ExtStorage;

    const btns = ['masters', 'lichess'].map((val) => {
      const selected = database === val;

      const btn = html('button', {
        className: `tab ${selected ? 'selected' : ''}`,
        textContent: capitalize(val),
        onclick: async () => {
          browser.storage.local.set({ database: val });
          renderOpeningExplorer();
        },
      }) as HTMLButtonElement;

      btn.disabled = selected;

      return btn;
    });

    tabs.append(...btns);

    return tabs;
  }

  async function renderRefreshBtn() {
    const refreshBtn = html('button', {
      id: 'refreshBtn',
      onclick: async () => {
        const url = await constructURL();
        await timeDebouncedFetchLichess(url);
        const openingExplorer = document.getElementById(openingExplorerId)!;
        openingExplorer.dataset.isOptionsOpen = 'false';
      },
    }, [await svg('../icons/MdiRefresh.svg')]);

    return refreshBtn;
  }

  async function renderOptionsBtn() {
    const optionsBtn = html('button', {
      id: 'optionsBtn',
      onclick: async () => {
        const openingExplorer = document.getElementById(openingExplorerId)!;
        openingExplorer.dataset.isOptionsOpen = openingExplorer.dataset.isOptionsOpen === 'true' ? 'false' : 'true';
        renderOpeningExplorer();
      },
    }, [
      await svg('../icons/MdiCog.svg'),
    ]);

    return optionsBtn;
  }

  const header = html('div', {
    id: headerId,
  }, [
    html('div', {
      className: 'headerLeft',
    }, [
      await renderTabs(),
      await renderRefreshBtn(),
    ]),
    await renderOptionsBtn(),
  ]);

  return header;
}

async function constructURL() {
  const { database, databaseOptions } = await browser.storage.local.get() as ExtStorage;
  let url = '';

  if (database === 'lichess') {
    const speeds = databaseOptions.lichess.speeds.join(',');
    const ratings = databaseOptions.lichess.ratings.join(',');
    const since = databaseOptions.lichess.since ? `&since=${databaseOptions.lichess.since}` : '';
    const until = databaseOptions.lichess.until ? `&until=${databaseOptions.lichess.until}` : '';
    url = `https://explorer.lichess.org/lichess?variant=standard&fen=${encodeURIComponent(fen)}&speeds=${speeds}&ratings=${ratings}&topGames=0&recentGames=0${since}${until}`;
  }
  else {
    const since = databaseOptions.masters.since ? `&since=${databaseOptions.masters.since}` : '';
    const until = databaseOptions.masters.until ? `&until=${databaseOptions.masters.until}` : '';
    url = `https://explorer.lichess.org/masters?fen=${encodeURIComponent(fen)}&topGames=0${since}${until}`;
  }

  return url;
}

async function fetchOrCache() {
  const url = await constructURL();
  const liResInCache = cache.get(url);

  if (liResInCache) {
    await updateLiResAndInsertContent(liResInCache);
    removeOverlay();
  }
  else {
    await timeDebouncedFetchLichess(url);
  }
}

async function updateFen() {
  document.dispatchEvent(new CustomEvent('requestFen'));

  if (fen === '') {
    setTimeout(updateFen, 100);
  }
  else {
    if (maxDepthReached(fen)) {
      updateLiResAndInsertContent(null);
    }
    else {
      await fetchOrCache();
    }

    // remove first-render loading icon after render is successful
    document.getElementById(loadingId)?.remove();
  }
}

async function updateLiResAndInsertContent(response: typeof liRes) {
  async function renderContent() {
    function renderTable(res: LiRes) {
      function renderMoveRow(move: Move, total: number, isTotalRow = false) {
        function renderPercentageBar(white: number, draws: number, black: number) {
          function renderPercentageText(percentage: number) {
            if (percentage >= 15)
              return `${String(percentage)}%`;
            if (percentage >= 10)
              return String(percentage);

            return '';
          }

          const total = white + draws + black;
          const wp = Math.round(white * 100 / total);
          const bp = Math.round(black * 100 / total);
          const dp = 100 - wp - bp;
          const cell = html('td');
          const percentageBar = html('div');
          const whiteBar = html('span', { textContent: renderPercentageText(wp) });
          const drawBar = html('span', { textContent: renderPercentageText(dp) });
          const blackBar = html('span', { textContent: renderPercentageText(bp) });

          whiteBar.style = /* style */`
            padding-inline-start: ${wp >= 10 && wp !== 100 ? '0.5rem' : '0'};
            background-color: var(--color-bg-white-eval); 
            color: var(--color-text-white-eval);
            width: ${wp}%;
            text-align: ${wp === 100 ? 'center' : 'start'};
          `;

          drawBar.style = /* style */`
            background-color: var(--color-bg-draw-eval); 
            color: var(--color-text-draw-eval);
            width: ${dp}%;
            text-align: center;
          `;

          blackBar.style = /* style */`
            padding-inline-end: ${bp >= 10 && bp !== 100 ? '0.5rem' : '0'};
            background-color: var(--color-bg-black-eval); 
            color: var(--color-text-black-eval);
            width: ${bp}%;
            text-align: ${bp === 100 ? 'center' : 'end'};
          `;

          cell.append(percentageBar);
          percentageBar.append(whiteBar, drawBar, blackBar);

          return cell;
        }

        const moveRow = html('tr', isTotalRow
          ? { className: 'totalRow' }
          : {
              onclick: () => document.dispatchEvent(new CustomEvent('sendUci', { detail: move.uci })),
              onmouseenter: () => document.dispatchEvent(new CustomEvent('addArrow', { detail: move.uci })),
              onmouseleave: () => document.dispatchEvent(new CustomEvent('removeArrow', { detail: move.uci })),
            });

        const moveTotal = move.white + move.draws + move.black;
        const perc = Math.round(moveTotal * 100 / total);
        const sanCell = html('td', { textContent: move.san });
        const percCell = html('td', { textContent: `${perc}%` });
        const moveTotalCell = html('td', { textContent: new Intl.NumberFormat().format(moveTotal) });

        moveRow.append(sanCell, percCell, moveTotalCell);
        moveRow.append(renderPercentageBar(move.white, move.draws, move.black));

        return moveRow;
      }

      const table = html('table');
      const tbody = html('tbody');
      const total = res.white + res.draws + res.black;
      const moveRows = res.moves.map(move => renderMoveRow(move, total));
      table.append(tbody);
      tbody.append(...moveRows);

      if (res.moves.length > 1) {
        const totalRow = renderMoveRow({
          averageRating: 0,
          white: res.white,
          draws: res.draws,
          black: res.black,
          game: null,
          opening: null,
          san: 'Σ',
          uci: 'Σ',
        }, total, true);

        tbody.append(totalRow);
      }

      return table;
    }

    function renderNoGameFound() {
      return html('p', { textContent: 'No game found' });
    }

    function renderMaxDepthReached() {
      return html('p', { textContent: 'Max depth reached!' });
    }

    async function renderUnauthorizedMsg() {
      const p = html('p', {
        style: {
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '0.5rem',
        },
      }, [
        await svg('../icons/MdiAlertCircleOutline.svg', {
          style: { width: '1.5rem', height: '1.5rem' },
        }),
        html('span', { textContent: 'Requires being logged in to Lichess.' }),
        html('a', {
          style: 'text-decoration: underline; display: inline-flex; gap: 0.25rem; align-items: center',
          href: 'https://lichess.org/login',
          target: '_blank',
        }, [
          html('span', { textContent: 'Log in' }),
          await svg('../icons/MdiLaunch.svg', {
            className: 'w-3 h-auto inline-block object-contain',
            style: { width: '1.5rem', height: '1.5rem' },
          }),
        ]),
      ]);

      return p;
    }

    const content = html('div', { id: contentId });

    if (liRes) {
      const noGameFound = liRes.white === 0 && liRes.black === 0 && liRes.draws === 0;
      content.append(noGameFound ? renderNoGameFound() : renderTable(liRes));
    }

    else if (liRes === null) {
      const maxDepthReached = renderMaxDepthReached();
      content.append(maxDepthReached);
    }

    else if (liRes === undefined) {
      const unauthorizedMsg = await renderUnauthorizedMsg();
      content.append(unauthorizedMsg);
    }

    return content;
  }

  liRes = response;
  const prevView = document.querySelector(`#${contentId}, #${optionsId}`);
  const content = await renderContent();

  if (!prevView) {
    // first render
    const openingExplorer = document.getElementById(openingExplorerId)!;
    openingExplorer.append(content);
  }
  else {
    /* Explicitly remove all arrows on content re-render,
    since moveRow's mouseleave can't fire if moveRow is removed from DOM. */
    document.dispatchEvent(new CustomEvent('removeAllArrows'));
    prevView.insertAdjacentElement('beforebegin', content);
    prevView.remove();
  }

  removeOverlay();
}

async function renderOptions() {
  function validateYear(val: string) {
    if (val === '')
      return true;
    const regex = /^\d{4}$/;
    if (!regex.test(val))
      return false;

    const year = Number(val);
    if (year < 1952)
      return false;

    return true;
  }

  function validateYearMonth(val: string) {
    if (val === '')
      return true;
    const regex = /^\d{4}-\d{2}$/;

    if (!regex.test(val))
      return false;

    const year = Number(val.slice(0, 4));
    const month = Number(val.slice(5));
    if (year < 1952)
      return false;
    if (month < 1 || month > 12)
      return false;

    return true;
  }

  function shallowCompare(o1: { [key: string]: any }, o2: { [key: string]: any }) {
    for (const key in o1) {
      const prop1 = o1[key];
      const prop2 = o2[key];

      if (Array.isArray(prop1) && Array.isArray(prop2)) {
      // compare arrays
        if (prop1.length !== prop2.length
          || !prop1.every((val, i) => val === prop2[i])
          || !prop2.every((val, i) => val === prop1[i])
        ) {
          return false;
        }
      }
      else if (prop1 !== prop2) {
      // compare primitives
        return false;
      }
    }

    return true;
  }

  async function renderTimeControlBtn(timeControl: TimeControl) {
    const { databaseOptions } = await browser.storage.local.get() as ExtStorage;
    const currentSelected = databaseOptions.lichess.speeds.includes(timeControl);

    const btn = html('button', {
      className: `timeControl ${currentSelected ? 'selected' : ''}`,
      type: 'button',
      ariaLabel: timeControl,
      title: capitalize(timeControl),
      onclick: () => { btn.classList.toggle('selected'); },
    }, [await svg(`../icons/timeControl/${timeControl}.svg`)]);

    return btn;
  }

  async function renderRatingBtn(rating: Rating) {
    const { databaseOptions } = await browser.storage.local.get() as ExtStorage;
    const currentSelected = databaseOptions.lichess.ratings.includes(rating);

    const btn = html('button', {
      className: `rating ${currentSelected ? 'selected' : ''}`,
      type: 'button',
      textContent: String(rating),
      onclick: () => btn.classList.toggle('selected'),
    });

    return btn;
  }

  const { database } = await browser.storage.local.get() as ExtStorage;
  const options = html('div', { id: optionsId });
  const form = html('form');

  const submit = html('button', {
    type: 'submit',
    className: 'cc-button-component cc-button-primary cc-button-medium cc-bg-primary analysis-view-button',
    textContent: 'Save',
  });

  /*
    - gather info from inputs into an object
    - if obj is identical from current storage
    - 1. openingExplorer.dataset.isOptionsOpen = 'false';
    - 2. renderOpeningExplorer()

    - if obj is different
    - 1. storage.set(newObj)
    - 2. openingExplorer.dataset.isOptionsOpen = 'false';
    - 3. renderOpeningExplorer()
  */
  if (database === 'lichess') {
    const { databaseOptions } = await browser.storage.local.get() as ExtStorage;
    // time control (must be in order)
    const timeControlBtns = await Promise.all(timeControls.map(tc => renderTimeControlBtn(tc)));

    const timeControlWrapper = html('div', {}, [
      html('p', { className: 'label', textContent: 'Time control' }),
      html('div', {}, timeControlBtns),
    ]);

    form.append(timeControlWrapper);

    // rating
    const ratingBtns = await Promise.all(ratings.map(r => renderRatingBtn(r)));

    const ratingWrapper = html('div', {}, [
      html('p', { className: 'label', textContent: 'Rating' }),
      html('div', {}, ratingBtns),
    ]);

    form.append(ratingWrapper);

    // since
    const sinceUntil = html('div', { id: 'sinceUntil' });
    const sinceWrapper = html('div');
    const sinceLabel = html('p', { className: 'label', textContent: 'Since' });

    const sinceInput = html('input', {
      name: 'since',
      title: 'Insert year and month in YYYY-MM format starting from 1952-01',
      placeholder: 'YYYY-MM',
      value: databaseOptions.lichess.since || '',
      oninput: () => {
        const submitBtn = form.querySelector('button[type=\'submit\']')! as HTMLButtonElement;
        const untilInput = form.querySelector('input[name=\'until\']')! as HTMLInputElement;
        submitBtn.disabled = !validateYearMonth(sinceInput.value) || !validateYearMonth(untilInput.value);
      },
    }) as HTMLInputElement;

    sinceWrapper.append(sinceLabel, sinceInput);

    // until
    const untilWrapper = html('div');
    const untilLabel = html('p', { className: 'label', textContent: 'Until' });

    const untilInput = html('input', {
      name: 'until',
      title: 'Insert year and month in YYYY-MM format starting from 1952-01',
      placeholder: 'YYYY-MM',
      value: databaseOptions.lichess.until || '',
      oninput: () => {
        const submitBtn = form.querySelector('button[type=\'submit\']')! as HTMLButtonElement;
        submitBtn.disabled = !validateYearMonth(sinceInput.value) || !validateYearMonth(untilInput.value);
      },
    }) as HTMLInputElement;

    untilWrapper.append(untilLabel, untilInput);

    sinceUntil.append(sinceWrapper, untilWrapper);
    form.append(sinceUntil);

    submit.onclick = async (e) => {
      e.preventDefault();

      const { databaseOptions } = await browser.storage.local.get() as ExtStorage;

      const selectedTimeControls = timeControlBtns.map((btn) => {
        const timeControl = btn.ariaLabel as TimeControl;
        const selected = btn.classList.contains('selected');

        return selected ? timeControl : null;
      }).filter(x => x !== null);

      const selectedRatings = ratingBtns.map((btn) => {
        const rating = btn.textContent;
        const selected = btn.classList.contains('selected');

        return selected ? Number(rating) as Rating : null;
      }).filter(x => x !== null);

      const submittedLichessOptions: typeof databaseOptions.lichess = {
        speeds: selectedTimeControls,
        ratings: selectedRatings,
        since: sinceInput.value || undefined,
        until: untilInput.value || undefined,
      };

      const formChanged = !shallowCompare(databaseOptions.lichess, submittedLichessOptions);

      if (formChanged) {
        browser.storage.local.set({
          databaseOptions: {
            ...databaseOptions,
            lichess: submittedLichessOptions,
          },
        });
      }

      document.getElementById(openingExplorerId)!.dataset.isOptionsOpen = 'false';
      renderOpeningExplorer();
    };
  }
  else {
    const { databaseOptions } = await browser.storage.local.get() as ExtStorage;
    // since
    const sinceUntil = html('div', { id: 'sinceUntil' });
    const sinceWrapper = html('div');
    const sinceLabel = html('p', { className: 'label', textContent: 'Since' });

    const sinceInput = html('input', {
      name: 'since',
      title: 'Insert year in YYYY format starting from 1952',
      placeholder: 'YYYY',
      value: databaseOptions.masters.since ? String(databaseOptions.masters.since) : '',
      oninput: () => {
        const submitBtn = form.querySelector('button[type=\'submit\']')! as HTMLButtonElement;
        const untilInput = form.querySelector('input[name=\'until\']')! as HTMLInputElement;
        submitBtn.disabled = !validateYear(sinceInput.value) || !validateYear(untilInput.value);
      },
    }) as HTMLInputElement;

    sinceWrapper.append(sinceLabel, sinceInput);

    // until
    const untilWrapper = html('div');
    const untilLabel = html('p', { className: 'label', textContent: 'Until' });

    const untilInput = html('input', {
      name: 'until',
      title: 'Insert year in YYYY format starting from 1952',
      placeholder: 'YYYY',
      value: databaseOptions.masters.until ? String(databaseOptions.masters.until) : '',
      oninput: () => {
        const submitBtn = form.querySelector('button[type=\'submit\']')! as HTMLButtonElement;
        submitBtn.disabled = !validateYear(sinceInput.value) || !validateYear(untilInput.value);
      },
    }) as HTMLInputElement;

    untilWrapper.append(untilLabel, untilInput);
    sinceUntil.append(sinceWrapper, untilWrapper);
    form.append(sinceUntil);

    submit.onclick = async (e) => {
      e.preventDefault();
      const { databaseOptions } = await browser.storage.local.get() as ExtStorage;

      const submittedMastersOptions: typeof databaseOptions.masters = {
        since: sinceInput.value ? Number(sinceInput.value) : undefined,
        until: untilInput.value ? Number(untilInput.value) : undefined,
      };

      const formChanged = !shallowCompare(databaseOptions.masters, submittedMastersOptions);

      if (formChanged) {
        browser.storage.local.set({
          databaseOptions: {
            ...databaseOptions,
            masters: submittedMastersOptions,
          },
        });
      }

      document.getElementById(openingExplorerId)!.dataset.isOptionsOpen = 'false';
      renderOpeningExplorer();
    };
  }

  form.append(submit);
  options.append(form);

  return options;
}

export async function renderOpeningExplorer() {
  /*
  - doesn't add listener on normal rerender (because flag stays true)
  - still add listener on file save (because flag resets to undefined)
  */

  if (!document.ccTweaks_responseFenListenerAdded) {
    document.addEventListener('responseFen', (e) => {
      const responseFenEvent = e as CustomEvent<string>;
      fen = responseFenEvent.detail;
    });

    document.ccTweaks_responseFenListenerAdded = true;
  }

  const prevOpeningExplorer = document.getElementById(openingExplorerId);

  if (prevOpeningExplorer) {
    // Re-render each child separately, not the whole div to avoid flashing
    if (!isOptionsOpen()) {
      await updateFen();
    }
    else {
      const currOptions = await renderOptions();
      const prevView = prevOpeningExplorer.querySelector(`#${contentId}, #${optionsId}`)!;
      prevView.insertAdjacentElement('beforebegin', currOptions);
      prevView.remove();
    }

    /* Call querySelector() after all the awaits,
      because if a render occurs before the awaits finish,
      prevHeader/prevView would be a stale object (i.e. no parent), making insertAdjacentElement() fail.
      - From MDN: "The beforebegin and afterend positions work only if the node is in a tree and has an element parent."
     */
    const currHeader = await renderHeader();
    const prevHeader = prevOpeningExplorer.querySelector(`#${headerId}`)!;
    prevHeader.insertAdjacentElement('beforebegin', currHeader);
    prevHeader.remove();

    return;
  }

  /*
    - Content script can't directly play moves on the board (world: 'ISOLATED')
    - So create a script in world: 'MAIN' to interact with
    - Here it's only injected on first render, not re-renders or file save
   */
  const mainWorldScriptInjected = document.body.querySelector('script[src$="mainWorldScript.js"]');

  if (!mainWorldScriptInjected) {
    const mainWorldScript = html('script', {
      src: browser.runtime.getURL('js/mainWorldScript.js'),
    });

    document.body.append(mainWorldScript);
  }

  const parent = document.querySelector('.analysis-view-component')!;

  const openingExplorer = html('div', {
    id: openingExplorerId,
    dataset: {
      isOptionsOpen: 'false',
    },
  }, [
    html('div', { id: loadingId }, [await svg('../icons/MdiLoading.svg')]),
    await renderHeader(),
  ]);

  parent.prepend(openingExplorer);
  await updateFen();
}

// details: https://regexr.com/8h4ik
export const openingExplorerRegex = /chess.com\/(?:analysis|a\/[a-zA-Z0-9]+\/analysis)/;
