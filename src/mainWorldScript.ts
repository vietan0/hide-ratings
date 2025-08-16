import type { KeyPressed, WCChessBoard } from './wcChessBoardTypes';

const greenKey: KeyPressed = 'shift';
document.ccTweaks_arrowKeys = [];

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
  const allMarkings = wcChessBoard.game.markings.getAll();

  const existingArrow = allMarkings.find(marking =>
    marking.type === 'arrow'
    && marking.data.from === from
    && marking.data.to === to
    && marking.data.keyPressed === greenKey,
  );

  if (!existingArrow) {
    const key = wcChessBoard.game.markings.toggleOne({
      data: { from, to, keyPressed: greenKey },
      type: 'arrow',
    });

    if (typeof key === 'string') {
      document.ccTweaks_arrowKeys!.push(key);
    }
  }
});

document.addEventListener('removeArrow', (e) => {
  const removeArrowEvent = e as CustomEvent<string>;
  const uci = removeArrowEvent.detail;
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  const wcChessBoard = getBoard();
  const allMarkings = wcChessBoard.game.markings.getAll();

  const existingArrow = allMarkings.find(marking =>
    marking.type === 'arrow'
    && marking.data.from === from
    && marking.data.to === to
    && marking.data.keyPressed === greenKey,
  );

  if (existingArrow) {
    wcChessBoard.game.markings.toggleOne({
      data: { from, to, keyPressed: greenKey },
      type: 'arrow',
    });

    const indexToRemove = document.ccTweaks_arrowKeys!.findIndex(str => str === existingArrow.key);
    document.ccTweaks_arrowKeys!.splice(indexToRemove, 1);
  }
});

document.addEventListener('removeAllArrows', () => {
  const wcChessBoard = getBoard();

  // workaround solution because the signature of removeMany, removeAllWhere or toggleMany is unknown
  for (const key of document.ccTweaks_arrowKeys!) {
    wcChessBoard.game.markings.removeOne(key);
  }

  document.ccTweaks_arrowKeys = [];
});
