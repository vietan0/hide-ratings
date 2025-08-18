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
    const div = document.createElement('div');
    div.id = `container-${id}`;
    div.className = 'border-b-[1px] border-zinc-700';
    const btn = document.createElement('button');
    btn.id = id;
    btn.className = 'flex justify-between items-center cursor-pointer w-full px-3 py-3 min-h-[37px] hover:bg-zinc-700 active:bg-zinc-600';

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

    div.append(btn);
    document.getElementById('container')!.append(div);
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
  const container = document.getElementById('container')!;
  const footer = container.nextElementSibling!;
  const footerLink = footer.getElementsByTagName('a').item(0)!;
  const svg = await renderSvg('src/icons/MdiLaunch.svg');
  svg.classList.add('w-3', 'h-auto', 'inline-block', 'object-contain');
  footerLink.append(svg);
}

renderFooterSvg();

browser.storage.local.onChanged.addListener((changes) => {
  const entries = Object.entries(changes) as [keyof ExtStorage, browser.storage.StorageChange][];
  const [changedKey] = entries[0]!;
  if (isFeatureId(changedKey))
    updateSwitchIcon(changedKey);
});
