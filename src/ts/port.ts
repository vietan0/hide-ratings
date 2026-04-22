import browser from 'webextension-polyfill';

// eslint-disable-next-line import/no-mutable-exports
export let port: browser.Runtime.Port & {
  addedLichessListener?: boolean;
};

export function initPort() {
  port = browser.runtime.connect({ name: 'my-content-script-port' });
}
