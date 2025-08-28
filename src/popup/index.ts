import browser from 'webextension-polyfill';
import features from '../features';
import renderSvg from '../renderSvg';
import { type ExtStorage, type FeatureId, type FeatureStorage, isFeatureId } from '../storageTypes';

async function renderSwitch(featureId: FeatureId, btn: HTMLButtonElement) {
  const storage = await browser.storage.local.get(featureId) as Pick<FeatureStorage, typeof featureId>;
  const switchIcon = await renderSvg(`src/icons/${storage[featureId] ? 'MdiToggleSwitch' : 'MdiToggleSwitchOff'}.svg`);
  switchIcon.classList.add('max-w-8', storage[featureId] ? 'text-[#81b64c]' : 'text-zinc-500');
  switchIcon.id = `switch-${featureId}`;
  btn.append(switchIcon);
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
    const btn = document.createElement('button');
    btn.id = id;
    btn.className = 'flex justify-between items-center cursor-pointer w-full p-3 hover:bg-zinc-700 active:bg-zinc-600 border-zinc-700 border-b-[1px] last:border-b-0';

    const infoDiv = document.createElement('div');
    infoDiv.className = 'flex flex-col gap-0.5 items-start';
    btn.append(infoDiv);

    const titleSpan = document.createElement('span');
    titleSpan.textContent = title;
    infoDiv.append(titleSpan);

    const descSpan = document.createElement('span');
    descSpan.className = 'text-xs text-zinc-400';
    descSpan.textContent = description;
    infoDiv.append(descSpan);

    renderSwitch(id, btn);
    btn.onclick = handleClick;
    document.getElementsByTagName('main').item(0)!.append(btn);
  }
}

function updateSwitchIcon(featureId: FeatureId) {
  const btn = document.getElementById(featureId) as HTMLButtonElement;
  const oldSwitchIcon = document.getElementById(`switch-${featureId}`)!;
  renderSwitch(featureId, btn);
  oldSwitchIcon.remove();
}

renderBtns();

async function renderFooterSvg() {
  const footer = document.getElementsByTagName('footer').item(0)!;
  const footerLink = footer.getElementsByTagName('a').item(0)!;
  const svg = await renderSvg('src/icons/MdiLaunch.svg');
  svg.classList.add('w-3', 'h-auto', 'inline-block', 'object-contain');
  footerLink.append(svg);
}

renderFooterSvg();

browser.storage.local.onChanged.addListener((changes) => {
  const entries = Object.entries(changes) as [keyof ExtStorage, browser.Storage.StorageChange][];
  const [changedKey] = entries[0]!;
  if (isFeatureId(changedKey))
    updateSwitchIcon(changedKey);
});
