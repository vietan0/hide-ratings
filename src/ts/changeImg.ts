import browser from 'webextension-polyfill';
import html from './html';

function getTopPlayerColor() {
  const clock = document.querySelector('.player-component.player-top > .clock-component');
  if (clock && clock.classList.contains('clock-white'))
    return 'white';

  return 'black';
}

export const placeholderImgId = 'placeholderImg';

export function overrideImg() {
  if (document.getElementById(placeholderImgId))
    return;
  const imgContainer = document.querySelector('.player-component.player-top .cc-avatar-component');
  if (!imgContainer)
    return;

  const placeholderImg = html('img', {
    id: placeholderImgId,
    src: browser.runtime.getURL(`../images/${getTopPlayerColor()}.png`),
  });

  imgContainer.append(placeholderImg);
}

export function restoreImg() {
  // css will unhide the original, only need to remove the placeholderImg
  document.getElementById(placeholderImgId)?.remove();
}
