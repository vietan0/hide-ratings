import browser from 'webextension-polyfill';
import { debounce } from 'es-toolkit';
import capitalize from './capitalize';
import renderSvg from './renderSvg';
import { type ExtStorage, type Rating, type TimeControl, ratings, timeControls } from './storageTypes';
import getFenFromUrl from './getFenFromUrl';
import maxDepthReached from './maxDepthReached';

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
const cache = new Map<string, LiRes>();
let fen = '';
let liRes: LiRes | undefined | null; // undefined when fetch() fails, null when maxDepthReached
const wait = 400;
let timeoutId: NodeJS.Timeout | undefined;

function addOverlay() {
  const overlay = document.createElement('div');
  overlay.className = overlayClass;
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

async function renderHeader() {
  async function renderTabs() {
    const tabs = document.createElement('div');
    tabs.id = 'tabs';
    const { database } = await browser.storage.local.get() as ExtStorage;

    const btns = ['masters', 'lichess'].map((val) => {
      const btn = document.createElement('button');
      const selected = database === val;
      if (selected)
        btn.classList.add('selected');

      btn.onclick = async () => {
        browser.storage.local.set({ database: val });
        renderOpeningExplorer();
      };

      btn.disabled = selected;
      btn.textContent = capitalize(val);

      return btn;
    });

    tabs.append(...btns);

    return tabs;
  }

  async function renderOptionsBtn() {
    const optionsBtn = document.createElement('button');
    optionsBtn.id = 'optionsBtn';
    const cogIcon = await renderSvg('src/icons/MdiCog.svg');
    optionsBtn.append(cogIcon);

    optionsBtn.onclick = async () => {
      const openingExplorer = document.getElementById(openingExplorerId)!;
      openingExplorer.dataset.isOptionsOpen = openingExplorer.dataset.isOptionsOpen === 'true' ? 'false' : 'true';
      renderOpeningExplorer();
    };

    return optionsBtn;
  }

  const header = document.createElement('div');
  header.id = headerId;
  header.append(await renderTabs(), await renderOptionsBtn());

  return header;
}

async function fetchLichess(url: string) {
  const response = await fetch(url)
    .then(r => r.json())
    .catch(err => console.error('There has been an error fetching from Lichess', err)) as LiRes | undefined;

  if (response) {
    cache.set(url, response);
  }

  if (timeoutId) {
    updateLiResAndInsertContent(response);
  }
  else {
    // timeoutId is undefined when invoked -> called after the wait period ends -> trailing-edge confirmed
    // Bug: when a streak of debounced calls ends in a position with a cached liRes (e.g. quickly ArrowLeft and ArrowRight before stopping on a visited position), but then the trailing-edge fetch changes liRes one last time, making liRes one/few moves ahead of the current board
    // Solution: When it's a trailing-edge invocation, only change liRes if fen in url match fen on board, ignore if not.
    if (getFenFromUrl(url) === fen) {
      updateLiResAndInsertContent(response);
    }
  }
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

async function fetchOrCache() {
  async function constructURL() {
    const { database, databaseOptions } = await browser.storage.local.get() as ExtStorage;
    let url = '';

    if (database === 'lichess') {
      const speeds = databaseOptions.lichess.speeds.join(',');
      const ratings = databaseOptions.lichess.ratings.join(',');
      const since = databaseOptions.lichess.since ? `&since=${databaseOptions.lichess.since}` : '';
      const until = databaseOptions.lichess.until ? `&until=${databaseOptions.lichess.until}` : '';
      url = `https://explorer.lichess.ovh/lichess?variant=standard&fen=${encodeURIComponent(fen)}&speeds=${speeds}&ratings=${ratings}&topGames=0&recentGames=0${since}${until}`;
    }
    else {
      const since = databaseOptions.masters.since ? `&since=${databaseOptions.masters.since}` : '';
      const until = databaseOptions.masters.until ? `&until=${databaseOptions.masters.until}` : '';
      url = `https://explorer.lichess.ovh/masters?fen=${encodeURIComponent(fen)}&topGames=0${since}${until}`;
    }

    return url;
  }

  const url = await constructURL();
  const liResInCache = cache.get(url);

  if (liResInCache) {
    updateLiResAndInsertContent(liResInCache);
    removeOverlay();
  }
  else {
    await timeDebouncedFetchLichess(url);
  }
}

async function updateFen() {
  document.dispatchEvent(new CustomEvent('requestFen'));

  if (maxDepthReached(fen)) {
    updateLiResAndInsertContent(null);
  }
  else {
    await fetchOrCache();
  }
}

function updateLiResAndInsertContent(response: typeof liRes) {
  function renderContent() {
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
          const cell = document.createElement('td');
          const percentageBar = document.createElement('div');
          const whiteBar = document.createElement('span');
          const drawBar = document.createElement('span');
          const blackBar = document.createElement('span');

          whiteBar.textContent = renderPercentageText(wp);
          drawBar.textContent = renderPercentageText(dp);
          blackBar.textContent = renderPercentageText(bp);

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

        const moveRow = document.createElement('tr');

        if (isTotalRow) {
          moveRow.classList.add('totalRow');
        }
        else {
          moveRow.onclick = async () => {
            document.dispatchEvent(new CustomEvent('sendUci', { detail: move.uci }));
          };

          moveRow.onmouseenter = () => {
            document.dispatchEvent(new CustomEvent('addArrow', { detail: move.uci }));
          };

          moveRow.onmouseleave = () => {
            document.dispatchEvent(new CustomEvent('removeArrow', { detail: move.uci }));
          };
        }

        const moveTotal = move.white + move.draws + move.black;
        const sanCell = document.createElement('td');
        sanCell.textContent = move.san;

        const percCell = document.createElement('td');
        const perc = Math.round(moveTotal * 100 / total);
        percCell.textContent = `${perc}%`;

        const moveTotalCell = document.createElement('td');
        moveTotalCell.textContent = new Intl.NumberFormat().format(moveTotal);

        moveRow.append(sanCell, percCell, moveTotalCell);
        moveRow.append(renderPercentageBar(move.white, move.draws, move.black));

        return moveRow;
      }

      const table = document.createElement('table');
      const tbody = document.createElement('tbody');
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
      const p = document.createElement('p');
      p.textContent = 'No game found';

      return p;
    }

    function renderMaxDepthReached() {
      const p = document.createElement('p');
      p.textContent = 'Max depth reached!';

      return p;
    }

    const content = document.createElement('div');
    content.id = contentId;

    if (liRes) {
      const noGameFound = liRes.white === 0 && liRes.black === 0 && liRes.draws === 0;
      content.append(noGameFound ? renderNoGameFound() : renderTable(liRes));
    }

    else if (liRes === null) {
      const maxDepthReached = renderMaxDepthReached();
      content.append(maxDepthReached);
    }

    return content;
  }

  liRes = response;
  const prevView = document.querySelector(`#${contentId}, #${optionsId}`);
  const content = renderContent();

  if (!prevView) {
    // first render
    const openingExplorer = document.getElementById(openingExplorerId)!;
    openingExplorer.append(content);
  }
  else {
    /* Explicitly remove all arrows on content re-render,
    since moveRow's mouseleave won't fire if moveRow is removed from DOM. */
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
    const btn = document.createElement('button');
    btn.className = 'timeControl';
    if (currentSelected)
      btn.classList.add('selected');
    btn.type = 'button';
    btn.ariaLabel = timeControl;
    btn.title = capitalize(timeControl);

    const timeControlIcon = await renderSvg(`src/icons/timeControl/${timeControl}.svg`);
    btn.append(timeControlIcon);

    btn.onclick = () => {
      btn.classList.toggle('selected');
    };

    return btn;
  }

  async function renderRatingBtn(rating: Rating) {
    const { databaseOptions } = await browser.storage.local.get() as ExtStorage;
    const currentSelected = databaseOptions.lichess.ratings.includes(rating);
    const btn = document.createElement('button');
    btn.className = 'rating';
    if (currentSelected)
      btn.classList.add('selected');
    btn.type = 'button';

    btn.textContent = String(rating);

    btn.onclick = () => {
      btn.classList.toggle('selected');
    };

    return btn;
  }

  const { database } = await browser.storage.local.get() as ExtStorage;
  const options = document.createElement('div');
  options.id = optionsId;
  const form = document.createElement('form');
  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className = 'cc-button-component cc-button-primary cc-button-medium cc-bg-primary analysis-view-button';
  submit.textContent = 'Save';

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
    const timeControlWrapper = document.createElement('div');
    const p = document.createElement('p');
    p.className = 'label';
    p.textContent = 'Time control';
    const timeControlBtnsContainer = document.createElement('div');
    const timeControlBtns = await Promise.all(timeControls.map(tc => renderTimeControlBtn(tc)));
    timeControlBtnsContainer.append(...timeControlBtns);
    timeControlWrapper.append(p, timeControlBtnsContainer);
    form.append(timeControlWrapper);

    // rating
    const ratingWrapper = document.createElement('div');
    const p2 = document.createElement('p');
    p2.className = 'label';
    p2.textContent = 'Rating';
    const ratingBtnsContainer = document.createElement('div');
    const ratingBtns = await Promise.all(ratings.map(r => renderRatingBtn(r)));
    ratingBtnsContainer.append(...ratingBtns);
    ratingWrapper.append(p2, ratingBtnsContainer);
    form.append(ratingWrapper);

    // since
    const sinceUntil = document.createElement('div');
    sinceUntil.id = 'sinceUntil';
    const sinceWrapper = document.createElement('div');
    const sinceLabel = document.createElement('p');
    sinceLabel.className = 'label';
    sinceLabel.textContent = 'Since';
    const sinceInput = document.createElement('input');
    sinceInput.name = 'since';
    sinceInput.title = 'Insert year and month in YYYY-MM format starting from 1952-01';
    sinceInput.placeholder = 'YYYY-MM';
    sinceInput.value = databaseOptions.lichess.since || '';

    sinceInput.oninput = () => {
      const submitBtn = form.querySelector('button[type=\'submit\']')! as HTMLButtonElement;
      const untilInput = form.querySelector('input[name=\'until\']')! as HTMLInputElement;
      submitBtn.disabled = !validateYearMonth(sinceInput.value) || !validateYearMonth(untilInput.value);
    };

    sinceWrapper.append(sinceLabel, sinceInput);

    // until
    const untilWrapper = document.createElement('div');
    const untilLabel = document.createElement('p');
    untilLabel.className = 'label';
    untilLabel.textContent = 'Until';
    const untilInput = document.createElement('input');
    untilInput.name = 'until';
    untilInput.title = 'Insert year and month in YYYY-MM format starting from 1952-01';
    untilInput.placeholder = 'YYYY-MM';
    untilInput.value = databaseOptions.lichess.until || '';

    untilInput.oninput = () => {
      const submitBtn = form.querySelector('button[type=\'submit\']')! as HTMLButtonElement;
      submitBtn.disabled = !validateYearMonth(sinceInput.value) || !validateYearMonth(untilInput.value);
    };

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
    const sinceUntil = document.createElement('div');
    sinceUntil.id = 'sinceUntil';
    const sinceWrapper = document.createElement('div');
    const sinceLabel = document.createElement('p');
    sinceLabel.className = 'label';
    sinceLabel.textContent = 'Since';
    const sinceInput = document.createElement('input');
    sinceInput.name = 'since';
    sinceInput.title = 'Insert year in YYYY format starting from 1952';
    sinceInput.placeholder = 'YYYY';
    sinceInput.value = databaseOptions.masters.since ? String(databaseOptions.masters.since) : '';

    sinceInput.oninput = () => {
      const submitBtn = form.querySelector('button[type=\'submit\']')! as HTMLButtonElement;
      const untilInput = form.querySelector('input[name=\'until\']')! as HTMLInputElement;
      submitBtn.disabled = !validateYear(sinceInput.value) || !validateYear(untilInput.value);
    };

    sinceWrapper.append(sinceLabel, sinceInput);

    // until
    const untilWrapper = document.createElement('div');
    const untilLabel = document.createElement('p');
    untilLabel.className = 'label';
    untilLabel.textContent = 'Until';
    const untilInput = document.createElement('input');
    untilInput.name = 'until';
    untilInput.title = 'Insert year in YYYY format starting from 1952';
    untilInput.placeholder = 'YYYY';
    untilInput.value = databaseOptions.masters.until ? String(databaseOptions.masters.until) : '';

    untilInput.oninput = () => {
      const submitBtn = form.querySelector('button[type=\'submit\']')! as HTMLButtonElement;
      submitBtn.disabled = !validateYear(sinceInput.value) || !validateYear(untilInput.value);
    };

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
  const mainWorldScriptInjected = document.body.querySelector('script[src$="dist/mainWorldScript.js"]');

  if (!mainWorldScriptInjected) {
    const mainWorldScript = document.createElement('script');
    mainWorldScript.src = browser.runtime.getURL('dist/mainWorldScript.js');
    document.body.append(mainWorldScript);
  }

  const parent = document.querySelector('.analysis-view-component')!;
  const openingExplorer = document.createElement('div');
  openingExplorer.id = openingExplorerId;
  openingExplorer.dataset.isOptionsOpen = 'false';
  parent.prepend(openingExplorer);

  const loadingContainer = document.createElement('div');
  loadingContainer.id = 'loading';
  const loadingIcon = await renderSvg('src/icons/MdiLoading.svg');
  loadingContainer.append(loadingIcon);
  openingExplorer.append(loadingContainer);

  openingExplorer.append(await renderHeader());
  await updateFen();
  loadingContainer.remove();
}

export const openingExplorerRegex = /chess.com\/analysis/;
