const features = ['hideRatings', 'hideOpponent', 'hideFlags'];

async function render() {
  const storage = await browser.storage.local.get();

  if (Object.entries(storage).length === 0) {
    // just installed, local storage is empty, initiate values
    const initialValues = {};

    for (const feature of features) {
      initialValues[feature] = false;
    }

    await browser.storage.local.set(initialValues);
  }

  renderBtns();
}

render();

async function renderSwitch(feature, btn) {
  const storage = await browser.storage.local.get(feature);
  const switchIcon = document.createElement('img');
  switchIcon.className = 'max-w-6';
  switchIcon.id = `switch-${feature}`;
  switchIcon.src = storage[feature] ? './LineMdSwitchOffTwotoneToSwitchTwotoneTransition.svg' : './LineMdSwitchTwotoneToSwitchOffTwotoneTransition.svg';
  btn.append(switchIcon);
}

async function renderBtns() {
  for (const feature of features) {
    const btn = document.createElement('button');
    btn.id = feature;
    const className = 'flex justify-between items-center cursor-pointer text-xs px-2 py-1.5 min-h-[37px] border-b-[1px] border-zinc-700 hover:bg-zinc-700 active:bg-zinc-600';
    btn.className = className;

    const span = document.createElement('span');
    span.textContent = feature;
    btn.append(span);

    renderSwitch(feature, btn);
    document.getElementById('container').append(btn);

    btn.onclick = handleClick;
  }
}

async function handleClick(e) {
  const featureName = e.currentTarget.textContent;
  const storage = await browser.storage.local.get(featureName);

  await browser.storage.local.set({
    [featureName]: !storage[featureName],
  });
}

function notifyBackground(changes) {
  // update the switch icon
  const [changedFeature] = Object.keys(changes);
  const btn = document.getElementById(changedFeature);
  const oldSwitchIcon = document.getElementById(`switch-${changedFeature}`);
  renderSwitch(changedFeature, btn);
  oldSwitchIcon.remove();
}

browser.storage.local.onChanged.addListener(notifyBackground);
