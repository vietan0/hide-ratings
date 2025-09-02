import { type WCChessBoard, ccTweaksTag } from './wcChessBoardTypes';

const color = '#a09bfa';

function getBoard() {
  return document.getElementById('board-analysis-board') as WCChessBoard;
}

document.addEventListener('sendUci', (e) => {
  const sendUciEvent = e as CustomEvent<string>;
  const uci = sendUciEvent.detail;
  const wcChessBoard = getBoard();

  wcChessBoard.game.move({
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci[4],
  });
});

document.addEventListener('requestFen', () => {
  const wcChessBoard = getBoard();
  const fen = wcChessBoard.game.getFEN();
  document.dispatchEvent(new CustomEvent('responseFen', { detail: fen }));
});

document.addEventListener('addArrow', (e) => {
  const addArrowEvent = e as CustomEvent<string>;
  const uci = addArrowEvent.detail;
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  const wcChessBoard = getBoard();

  wcChessBoard.game.markings.toggleOne({
    data: { from, to, color },
    type: 'arrow',
    tags: [ccTweaksTag],
  });
});

document.addEventListener('removeArrow', (e) => {
  const removeArrowEvent = e as CustomEvent<string>;
  const uci = removeArrowEvent.detail;
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  const wcChessBoard = getBoard();

  const allCCTweaksArrows = wcChessBoard.game.markings.getAllWhere({
    tags: [ccTweaksTag],
  });

  /*
    When clicking a row (state: on):
      1. openingExplorer rerenders which triggers 'removeAllArrow' -> (state: off),
      2. then mouseleave event triggers 'removeArrow' -> (state: on)
      -> 'removeArrow' would mistakenly turn on an arrow that has been removed by 'removeAllArrow'
    That's why a condition is needed:
   */
  if (allCCTweaksArrows.find(arrow => arrow.key.includes(uci))) {
    wcChessBoard.game.markings.toggleOne({
      data: { from, to, color },
      type: 'arrow',
      tags: [ccTweaksTag],
    });
  }
});

document.addEventListener('removeAllArrows', () => {
  const wcChessBoard = getBoard();

  wcChessBoard.game.markings.removeAllWhere({
    tags: [ccTweaksTag],
  });
});
