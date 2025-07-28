import features from '../features';

async function renderSwitch(feature, btn) {
  const storage = await browser.storage.local.get(feature);
  const switchIcon = document.createElement('img');
  switchIcon.className = 'max-w-6';
  switchIcon.id = `switch-${feature}`;
  switchIcon.src = storage[feature] ? './LineMdSwitchOffTwotoneToSwitchTwotoneTransition.svg' : './LineMdSwitchTwotoneToSwitchOffTwotoneTransition.svg';
  btn.append(switchIcon);
}

async function handleClick(e) {
  const featureName = e.currentTarget.textContent;
  const storage = await browser.storage.local.get(featureName);

  await browser.storage.local.set({
    [featureName]: !storage[featureName],
  });
}

async function renderBtns() {
  for (const feature of features) {
    const div = document.createElement('div');
    div.id = `container-${feature}`;
    div.className = 'border-b-[1px] border-zinc-700';
    const btn = document.createElement('button');
    btn.id = feature;
    btn.className = 'flex justify-between items-center cursor-pointer w-full text-xs px-2 py-1.5 min-h-[37px] hover:bg-zinc-700 active:bg-zinc-600';

    const span = document.createElement('span');
    span.textContent = feature;
    btn.append(span);

    renderSwitch(feature, btn);
    btn.onclick = handleClick;

    div.append(btn);
    document.getElementById('container').append(div);
  }
}

function updateSwitchIcon(changedFeature) {
  const btn = document.getElementById(changedFeature);
  const oldSwitchIcon = document.getElementById(`switch-${changedFeature}`);
  renderSwitch(changedFeature, btn);
  oldSwitchIcon.remove();
}

renderBtns();

browser.storage.local.onChanged.addListener((changes) => {
  const [changedFeature] = Object.keys(changes);

  updateSwitchIcon(changedFeature);
});
