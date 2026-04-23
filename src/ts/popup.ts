import type { ExtStorage, FeatureId, FeatureStorage } from './storageTypes';
import browser from 'webextension-polyfill';
import features from './features';
import html from './html';
import { isFeatureId } from './storageTypes';
import svg from './svg';

async function createSwitchIcon(featureId: FeatureId) {
  const storage = await browser.storage.local.get(featureId) as Pick<FeatureStorage, typeof featureId>;

  const switchIcon = await svg(`../icons/${storage[featureId] ? 'MdiToggleSwitch' : 'MdiToggleSwitchOff'}.svg`, {
    id: `switch-${featureId}`,
    class: `max-w-8 ${storage[featureId] ? 'text-[#81b64c]' : 'text-zinc-500'}`,
  });

  return switchIcon;
}

async function handleClick(e: MouseEvent) {
  const featureBtn = e.currentTarget as HTMLButtonElement;
  const featureId = featureBtn.id as FeatureId;
  const storage = await browser.storage.local.get(featureId) as Pick<FeatureStorage, typeof featureId>;

  await browser.storage.local.set({
    [featureId]: !storage[featureId],
  });
}

async function renderBtns() {
  for (const { id, title, description } of features) {
    const btn = html('button', {
      id,
      className: 'flex justify-between items-center cursor-pointer w-full p-3 hover:bg-zinc-700 active:bg-zinc-600 border-zinc-700 border-b-[1px] last:border-b-0',
      onclick: handleClick,
    }, [
      html('div', { className: 'flex flex-col gap-0.5 items-start' }, [
        html('span', { textContent: title }),
        html('span', { className: 'text-xs text-zinc-400', textContent: description }),
        id === 'openingExplorer'
          ? html('span', { className: 'flex gap-1 items-center mt-1' }, [
              await svg('../icons/MdiAlertCircleOutline.svg', { class: 'max-w-4 max-h-4 text-cyan-200' }),
              html('span', { className: 'text-xs text-cyan-200', textContent: 'Requires being logged in to Lichess' }),
            ])
          : null,
      ]),
      await createSwitchIcon(id),
    ]);

    document.getElementsByTagName('main').item(0)!.append(btn);
  }
}

async function updateSwitchIcon(featureId: FeatureId) {
  const newSwitchIcon = await createSwitchIcon(featureId);
  const oldSwitchIcon = document.getElementById(`switch-${featureId}`)!;
  oldSwitchIcon.replaceWith(newSwitchIcon);
}

renderBtns();

async function renderFooterSvg() {
  const footer = document.getElementsByTagName('footer').item(0)!;
  const footerLink = footer.getElementsByTagName('a').item(0)!;

  const launchIcon = await svg('../icons/MdiLaunch.svg', {
    class: 'w-3 h-auto inline-block object-contain',
  });

  footerLink.append(launchIcon);
}

renderFooterSvg();

browser.storage.local.onChanged.addListener((changes) => {
  const entries = Object.entries(changes) as [keyof ExtStorage, browser.Storage.StorageChange][];
  const [changedKey] = entries[0]!;
  if (isFeatureId(changedKey))
    updateSwitchIcon(changedKey);
});
