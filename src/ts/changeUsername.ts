import html from './html';

export const placeholderUsername = 'Unknown';

export function overrideUsername() {
  if (document.getElementById(placeholderUsername))
    return;

  const topUserBlock = document.querySelector('.player-component.player-top .cc-user-block-component, .player-component.player-top .user-tagline-compact-theatre')!;

  const placeholderUsernameDiv = html('div', {
    id: placeholderUsername,
    textContent: placeholderUsername,
    className: 'cc-text-medium-bold cc-user-username-component cc-user-username-white',
    // inline style to bypass the hide rules
    // flex to keep the text centered in focus mode
    style: { display: 'flex !important' },
  });

  if (topUserBlock.classList.contains('user-tagline-compact-theatre')) {
    // focus mode
    placeholderUsernameDiv.classList.add('user-tagline-compact-row');
  }

  topUserBlock.prepend(placeholderUsernameDiv);
}

export function restoreUsername() {
  // css will unhide the original, only need to remove the placeholder
  document.getElementById(placeholderUsername)?.remove();
}
