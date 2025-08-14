import type { WCChessBoard } from './wcChessBoardTypes';

document.addEventListener('sendUci', (e) => {
  const customEvent = e as CustomEvent<string>;
  const uci = customEvent.detail;
  const wcChessBoard = document.getElementById('board-analysis-board') as WCChessBoard;

  wcChessBoard.game.move({
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci[4],
  });
});
