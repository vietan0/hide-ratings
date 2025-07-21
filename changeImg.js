function getTopPlayerColor() {
  const clock = document.querySelector('.player-component.player-top > .clock-component');
  if (clock.classList.contains('clock-white'))
    return 'white';

  return 'black';
}

export function overrideImg() {
  const imgContainer = document.querySelector('.player-component.player-top .player-avatar-component.player-avatar');
  const placeholderImg = document.createElement('img');
  placeholderImg.id = 'placeholderImg';
  placeholderImg.src = browser.runtime.getURL(`images/${getTopPlayerColor()}.png`);

  if (imgContainer.children.length === 2) {
    // length = 2 means the avatar hasn't been modified (original img & presence indicator)
    imgContainer.append(placeholderImg);
  }
}

export function restoreImg() {
  // css will unhide the original, only need to remove the placeholder
  document.getElementById('placeholderImg')?.remove();
}
