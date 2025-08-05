function getTopPlayerColor() {
  const clock = document.querySelector('.player-component.player-top > .clock-component');
  if (clock.classList.contains('clock-white'))
    return 'white';

  return 'black';
}

export const placeholderImgId = 'placeholderImg';

export function overrideImg() {
  if (document.getElementById(placeholderImgId))
    return;
  const imgContainer = document.querySelector('.player-component.player-top .player-avatar-component.player-avatar');
  const placeholderImg = document.createElement('img');
  placeholderImg.id = placeholderImgId;
  placeholderImg.src = browser.runtime.getURL(`src/images/${getTopPlayerColor()}.png`);
  imgContainer.append(placeholderImg);
}

export function restoreImg() {
  // css will unhide the original, only need to remove the placeholderImg
  document.getElementById(placeholderImgId)?.remove();
}
