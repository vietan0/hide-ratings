import browser from 'webextension-polyfill';
import { overrideImg, placeholderImgId, restoreImg } from './changeImg';
import { overrideUsername, placeholderUsername, restoreUsername } from './changeUsername';
import isGameOver from './isGameOver';
import type { ExtStorage } from './storageTypes';

// details: https://regexr.com/8gcck
export const hideOpponentRegex = /chess.com\/(?:game\/(?:live\/|daily\/)?\d+|play\/online\/new)/;

function usernameFail() {
  const currentUsername = document.getElementById('notifications-request')!.getAttribute('username')!;
  const usernameDivs = Array.from(document.querySelectorAll<HTMLDivElement>('.player-tagline .cc-user-username-component, .player-tagline .user-username-component'));
  const usernamesInPage = usernameDivs.map(x => x.textContent!.toLowerCase());
  const bothUsernamesLoaded = !usernamesInPage.includes('opponent');
  const currentUserPlaying = usernamesInPage.includes(currentUsername.toLowerCase());

  if (!bothUsernamesLoaded || !currentUserPlaying) {
    return { cond: false, reason: 'username' } as const;
  }
}

/**
 * - This function doesn't check for storage's `hideOpponent` and should only be called when it's already `true`.
 * - This function doesn't check if hideOpponent code is already in effect (avatar & username replaced)
 * - If return `{ cond: true }`, proceed to hide opponent.
 * - If return `{ cond: false, reason: string }`, unhide/do nothing depends on the case.
 * @returns whether all conditions to invoke `startHideOpponent()` are met.
 */
export function checkHideOpponentConds() {
  // 1. url condition
  // 2. username-related conditions
  // 3. game over-related conditions
  if (!window.location.href.match(hideOpponentRegex))
    return { cond: false, reason: 'url' } as const;

  return usernameFail() || isGameOver() || { cond: true };
}

export function hideOpponentInEffect() {
  const placeholderImg = document.getElementById(placeholderImgId);
  const placeholderUsernameDiv = document.getElementById(placeholderUsername);

  return Boolean(placeholderImg || placeholderUsernameDiv);
}

export function startHideOpponent(port: browser.Runtime.Port) {
  port.postMessage({ command: 'hideOpponent' });
  overrideImg();
  overrideUsername();
}

export function stopHideOpponent(port: browser.Runtime.Port) {
  port.postMessage({ command: 'unhideOpponent' });
  restoreImg();
  restoreUsername();
}

/**
 * Run:
 * 1. When port first connects
 * 2. In mutation observer
 */
export async function hideOrUnhide(port: browser.Runtime.Port) {
  if (hideOpponentInEffect() && isGameOver()) {
    stopHideOpponent(port);
  }
  else {
    const { hideOpponent } = await browser.storage.local.get() as ExtStorage;

    if (hideOpponent) {
      if (checkHideOpponentConds().cond) {
        startHideOpponent(port);
      }
    }
  }
}
