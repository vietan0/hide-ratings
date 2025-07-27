export const placeholderUsername = 'Unknown';

export function overrideUsername() {
  if (document.getElementById(placeholderUsername))
    return;

  const topUserBlock = document.querySelector('.player-component.player-top .cc-user-block-component, .player-component.player-top .user-tagline-compact-theatre');
  const placeholderUsernameDiv = document.createElement('div');
  placeholderUsernameDiv.id = placeholderUsername;
  placeholderUsernameDiv.className = 'cc-text-medium-bold cc-user-username-component cc-user-username-white';

  if (topUserBlock.classList.contains('user-tagline-compact-theatre')) {
    // focus mode
    placeholderUsernameDiv.classList.add('user-tagline-compact-row');
  }

  // inline style to bypass the hide rules
  // flex to keep the text center in focus mode
  placeholderUsernameDiv.style = 'display: flex !important;';
  placeholderUsernameDiv.textContent = placeholderUsername;
  topUserBlock.prepend(placeholderUsernameDiv);
}

export function restoreUsername() {
  // css will unhide the original, only need to remove the placeholder
  document.getElementById(placeholderUsername)?.remove();
}
