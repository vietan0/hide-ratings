import type { ExtStorage } from './storageTypes';

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

interface Response {
  white: number;
  draws: number;
  black: number;
  moves: Move[];
  recentGames?: [];
  topGames: [];
  opening: Opening;
}

export const openingExplorerId = 'openingExplorer';
const scrollContainerId = 'scrollContainer';
const cache = new Map<string, Response>();

async function fetchLichess(fen: string) {
  const lichessUrl = `https://explorer.lichess.ovh/lichess?variant=standard&fen=${fen}&speeds=bullet,blitz,rapid,classical,correspondence&ratings=1000,1200,1400,1600,1800,2000,2200,2500&topGames=0&recentGames=0`;
  const masterUrl = `https://explorer.lichess.ovh/masters?fen=${fen}&topGames=0`;
  const { database } = await browser.storage.local.get() as ExtStorage;
  const url = database === 'lichess' ? lichessUrl : masterUrl;
  const resInCache = cache.get(url);

  if (resInCache) {
    return resInCache;
  }

  // set loading state before calling await fetch()
  const overlay = document.createElement('div');
  overlay.className = 'overlay';

  overlay.style = /* style */`
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
    background-color: hsla(0, 0%, 0%, 0.2);
  `;

  const openingExplorer = document.getElementById(openingExplorerId);

  if (openingExplorer) {
    openingExplorer!.append(overlay);
  }

  const response = await fetch(url)
    .then(r => r.json())
    .catch(err => console.error('There has been an error fetching from Lichess', err)) as Response;

  for (const div of document.getElementsByClassName('overlay')) {
    div.remove();
  }

  cache.set(url, response);

  return response;
}

function noGameFound(res: Response) {
  return res.white === 0 && res.black === 0 && res.draws === 0;
}

function renderPercentageText(percentage: number) {
  if (percentage >= 15)
    return `${String(percentage)}%`;
  if (percentage >= 10)
    return String(percentage);

  return '';
}

function renderPercentageBar(white: number, draws: number, black: number) {
  const total = white + draws + black;
  const wp = Math.round(white * 100 / total);
  const bp = Math.round(black * 100 / total);
  const dp = 100 - wp - bp;
  const cell = document.createElement('td');
  const percentageBar = document.createElement('div');

  cell.style = /* style */`
    padding: 0px;
    padding-inline-end: 8px;
  `;

  percentageBar.style = /* style */`
    border-radius: var(--radius-s);
    display: flex;
    overflow: hidden;
    font-size: 1.1rem;
    font-weight: 600;
    line-height: 2.3rem;
  `;

  const whiteBar = document.createElement('span');
  const drawBar = document.createElement('span');
  const blackBar = document.createElement('span');

  whiteBar.textContent = renderPercentageText(wp);
  drawBar.textContent = renderPercentageText(dp);
  blackBar.textContent = renderPercentageText(bp);

  whiteBar.style = /* style */`
    padding-inline: ${wp > 0 ? '0.5rem' : '0'};
    background-color: var(--color-bg-white-eval); 
    color: var(--color-text-white-eval);
    width: ${wp}%;
    text-align: start;
  `;

  drawBar.style = /* style */`
    padding-inline: ${dp > 0 ? '0.5rem' : '0'};
    background-color: var(--color-bg-draw-eval); 
    color: var(--color-text-draw-eval);
    width: ${dp}%;
    text-align: center;
  `;

  blackBar.style = /* style */`
    padding-inline: ${bp > 0 ? '0.5rem' : '0'};
    background-color: var(--color-bg-black-eval); 
    color: var(--color-text-black-eval);
    width: ${bp}%;
    text-align: end;
  `;

  cell.append(percentageBar);
  percentageBar.append(whiteBar, drawBar, blackBar);

  return cell;
}

function renderMoveRow(move: Move, total: number, isTotalRow = false) {
  const moveRow = document.createElement('tr');

  moveRow.style = /* style */`
    font-weight: ${isTotalRow ? 700 : 400};
    height: 28px; 
    vertical-align: middle;
  `;

  const moveTotal = move.white + move.draws + move.black;
  const sanCell = document.createElement('td');

  sanCell.style = /* style */`
    padding-inline-start: 8px;
  `;

  sanCell.textContent = move.san;
  const percCell = document.createElement('td');

  percCell.style = /* style */`
    padding-inline-end: 8px;
    font-size: 1.1rem;
    color: var(--color-text-subtle);
  `;

  const perc = Math.round(moveTotal * 100 / total);
  percCell.textContent = `${perc}%`;

  const moveTotalCell = document.createElement('td');

  moveTotalCell.style = /* style */`
    padding-inline-end: 8px;
    font-size: 1.1rem;
    color: var(--color-text-subtle);
    text-align: end;
  `;

  moveTotalCell.textContent = new Intl.NumberFormat().format(moveTotal);

  moveRow.append(sanCell, percCell, moveTotalCell);
  moveRow.append(renderPercentageBar(move.white, move.draws, move.black));

  return moveRow;
}

function renderTable(res: Response) {
  const table = document.createElement('table');

  table.style = /* style */`
    border-collapse: collapse;
  `;

  table.innerHTML = /* html */`
    <colgroup>
      <col style="width: 40px">
      <col style="width: 30px">
      <col style="width: 1%">
      <col>
    </colgroup>
  `;

  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');
  const tfoot = document.createElement('tfoot');
  const total = res.white + res.draws + res.black;
  const moveRows = res.moves.map(move => renderMoveRow(move, total));

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

  tbody.append(...moveRows);
  tfoot.append(totalRow);
  table.append(thead, tbody, tfoot);

  return table;
}

function renderNoGameFound() {
  const p = document.createElement('p');

  p.style = /* style */`
      font-size: 14px;
      text-align: center; 
      font-style: italic; 
      padding-block: 8px;
    `;

  p.textContent = 'No game found';

  return p;
}

function renderScrollContent(res: Response): HTMLParagraphElement | HTMLTableElement {
  return noGameFound(res) ? renderNoGameFound() : renderTable(res);
}

async function renderTabs() {
  const tabs = document.createElement('div');
  const { database } = await browser.storage.local.get() as ExtStorage;

  const btns = ['masters', 'lichess'].map((val) => {
    const btn = document.createElement('button');
    const selected = database === val;
    // background-color: ${selected ? 'var(--color-bg-subtler)' : 'transparent'};

    btn.style = /* style */`
      border: none; 
      padding: 0.5rem 1.5rem;
      background-color: ${selected ? 'var(--color-bg-subtlest)' : 'transparent'};
      color: ${selected ? 'var(--color-text-bolder)' : 'var(--color-text-default)'};
      border-top: ${selected ? 'var(--border-s) solid var(--color-border-subtler)' : 'none'};
      font-size: 1.2rem;
      font-weight: ${selected ? '600' : '400'};
      cursor: ${selected ? 'initial' : 'pointer'};
    `;

    btn.onmouseenter = () => {
      if (!selected)
        btn.style.backgroundColor = 'var(--color-bg-subtlest)';
    };

    btn.onmouseleave = () => {
      btn.style.backgroundColor = selected ? 'var(--color-bg-subtlest)' : 'transparent';
    };

    btn.onclick = () => {
      browser.storage.local.set({ database: val });
      fetchAndRender();
    };

    btn.disabled = selected;
    btn.textContent = val[0]!.toUpperCase() + val.slice(1);

    return btn;
  });

  tabs.append(...btns);

  return tabs;
}

async function renderOpeningExplorer(res: Response) {
  const existingOpeningExplorer = document.getElementById(openingExplorerId);

  if (existingOpeningExplorer) {
    // if there is openingExplorer in the DOM, update table & tabs only
    const tabs = existingOpeningExplorer.firstElementChild!;
    tabs.insertAdjacentElement('beforebegin', await renderTabs());
    tabs.remove();
    const scrollContent = document.getElementById(scrollContainerId)!.firstElementChild!;
    scrollContent.insertAdjacentElement('beforebegin', renderScrollContent(res));
    scrollContent.remove();

    return;
  }

  const parent = document.querySelector('.analysis-view-component')!;
  const openingExplorer = document.createElement('div');
  openingExplorer.id = openingExplorerId;

  openingExplorer.style = /* style */`
    position: relative;
    border-bottom: .1rem solid var(--color-border-default);
  `;

  const scrollContainer = document.createElement('div');
  scrollContainer.id = scrollContainerId;

  scrollContainer.style = /* style */`
    max-height: 90px;
    overflow-y: scroll;
    background-color: var(--color-bg-subtlest);
  `;

  scrollContainer.append(renderScrollContent(res));
  openingExplorer.append(await renderTabs(), scrollContainer);
  parent.prepend(openingExplorer);
}

export async function fetchAndRender() {
  const analysisViewLines = document.querySelector('.analysis-view-lines')!;
  const fen = analysisViewLines.getAttribute('fen')!;
  // const noGameFen = 'r1bqkbnr/pppp1pp1/n3p2p/8/4P3/N1P4P/PP1P1PP1/R1BQKBNR b KQkq - 2 4';
  const res = await fetchLichess(fen);
  renderOpeningExplorer(res);
}
