import { analyzeOnLichessClass } from './analyzeOnLichess';

export default function isGameOver() {
  const gameOverModal = document.querySelector('.board-modal-container-container');
  const gameReviewBtn = document.querySelector(`.game-review-buttons-component:not(.${analyzeOnLichessClass})`);
  const newGameBtns = document.querySelector('.new-game-buttons-component');
  const nextGameBtn = document.querySelector('.arena-footer-component > .cc-button-component');

  if (gameOverModal || gameReviewBtn || newGameBtns || nextGameBtn) {
    return { cond: false, reason: 'gameover' };
  }
}
