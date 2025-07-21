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

async function renderInput() {
  const { hideOpponent, usernames } = await browser.storage.local.get();
  // should run on popup AND on local changes
  const hideOpponentContainer = document.getElementById('container-hideOpponent');
  const form = document.createElement('form');
  form.id = 'form';
  form.className = 'hidden text-xs px-2 py-1.5 bg-zinc-700';
  hideOpponentContainer.append(form);

  const label = document.createElement('label');
  label.className = 'text-xs';
  label.textContent = 'Your username(s)';
  form.append(label);

  const flex = document.createElement('div');
  flex.className = 'flex gap-1 mt-1';
  form.append(flex);

  const input = document.createElement('input');
  input.id = 'input';
  input.className = 'bg-zinc-800 w-full text-xs px-2 py-1.5 rounded-sm focus:outline focus:outline-2 focus:outline-[#81b64c]';
  input.placeholder = 'Seperated by comma';
  // display names from storage
  input.value = usernames.join(', ');
  flex.append(input);

  const submit = document.createElement('button');
  submit.textContent = 'Save';
  submit.className = 'bg-[#81b64c] hover:opacity-75 active:opacity-100 cursor-pointer px-2 py-1.5 rounded-sm font-bold focus:outline focus:outline-2 focus:outline-white';

  async function saveUsernames(e) {
    e.preventDefault();

    if (input.value === '') {
      await browser.storage.local.set({ usernames: [] });

      return;
    }

    const commaRegex = /,\s*/g;
    const usernames = input.value.trim().split(commaRegex);
    await browser.storage.local.set({ usernames });
  }

  submit.onclick = saveUsernames;
  flex.append(submit);

  if (hideOpponent) {
    form.classList.remove('hidden');
  }
}

function updateSwitchIcon(changedFeature) {
  const btn = document.getElementById(changedFeature);
  const oldSwitchIcon = document.getElementById(`switch-${changedFeature}`);
  renderSwitch(changedFeature, btn);
  oldSwitchIcon.remove();
}

function toggleHideOpponentForm(changes) {
  const newValue = changes.hideOpponent.newValue;
  const form = document.getElementById('form');

  if (newValue) {
    form.classList.remove('hidden');
  }
  else {
    form.classList.add('hidden');
  }
}

function handleChange(changes) {
  /**
   * @type {'hideRatings' | 'hideOpponent' | 'hideFlags' | 'usernames'}
   */
  const [changedFeature] = Object.keys(changes);

  if (changedFeature === 'usernames') {
    // possibly update hide opponent
  }
  else {
    updateSwitchIcon(changedFeature);

    if (changedFeature === 'hideOpponent') {
      toggleHideOpponentForm(changes);
    }
  }
}

renderBtns();
renderInput();
browser.storage.local.onChanged.addListener(handleChange);
