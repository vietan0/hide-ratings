import type { WCChessBoard } from './wcChessBoardTypes';

document.addEventListener('sendUci', (e) => {
  const uci = (e as CustomEvent<string>).detail;
  const wcChessBoard = document.getElementById('board-analysis-board') as WCChessBoard;

  wcChessBoard.game.move({
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci[4],
  });
});

document.addEventListener('requestFen', () => {
  const wcChessBoard = document.getElementById('board-analysis-board') as WCChessBoard;
  const fen = wcChessBoard.game.getFEN();
  document.dispatchEvent(new CustomEvent('responseFen', { detail: fen }));
});
