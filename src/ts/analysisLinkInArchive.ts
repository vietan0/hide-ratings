import html from './html';
import svg from './svg';

const analysisLinkInArchiveClass = 'ccTweaks_analysisCell';
const headerCellClass = 'ccTweaks_headerCell';

function addHeaderCell() {
  const accuracyHeaderCell = document.querySelector<HTMLTableCellElement>('th.archived-games-analyze-cell, th.archive-games-analyze-cell');
  if (!accuracyHeaderCell)
    return;

  if (accuracyHeaderCell.nextElementSibling?.classList.contains(headerCellClass)) {
    // already exist
    return;
  }

  const ccTweaksHeaderCell = html('th', { className: `${headerCellClass} table-text-center` });
  accuracyHeaderCell.insertAdjacentElement('afterend', ccTweaksHeaderCell);
}

function addLinkCells() {
  async function addLink(cell: HTMLTableCellElement) {
    if (cell.nextElementSibling
      && cell.nextElementSibling.classList.contains(analysisLinkInArchiveClass)) {
      // already exist
      return;
    }

    const archivedGameLink = cell.querySelector('a');
    const oriHref = archivedGameLink!.getAttribute('href')!;
    // regex demonstration: https://regexr.com/8l4hh
    const hrefToAnalysis = oriHref.replace(/^[/.:\-\w+]+(?=\?\w|$)/, '$&/analysis');

    const analysisCell = html('td', { className: `${analysisLinkInArchiveClass} table-text-center` }, [
      html('a', { href: hrefToAnalysis }, [await svg('../icons/Analyze.svg')]),
    ]);

    cell.insertAdjacentElement('afterend', analysisCell);
  }

  const analyzeCells = Array.from(document.querySelectorAll('td.archived-games-analyze-cell, td.archive-games-analyze-cell')) as HTMLTableCellElement[];
  if (analyzeCells.length === 0)
    return;

  for (const cell of analyzeCells) {
    addLink(cell);
  }
}

function removeHeaderCell() {
  const ccTweaksHeaderCells = Array.from(document.getElementsByClassName(headerCellClass));
  // there should only be one

  for (const cell of ccTweaksHeaderCells) {
    cell.remove();
  }
}

function removeLinkCells() {
  const allAddedLinks = Array.from(document.getElementsByClassName(analysisLinkInArchiveClass));

  for (const link of allAddedLinks) {
    link.remove();
  }
}

export function removeAnalysisLinks() {
  removeHeaderCell();
  removeLinkCells();
}

export function addAnalysisLinks() {
  addHeaderCell();
  addLinkCells();
}

/* Details: https://regexr.com/8glks
  Should match
  - https://www.chess.com/home
  - https://www.chess.com/games/archive/vietan0
  - https://www.chess.com/member/vietan0/*
 */
export const analysisLinkInArchiveRegex = /chess.com\/(?:home|games\/archive|member(?=\/\w))/;
