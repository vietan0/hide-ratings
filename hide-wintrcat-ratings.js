(async () => {
  if (window.hasRun)
    return;

  window.hasRun = true;
  hideRatingsInGamesList();
})();

const ratingRegex = /\s\(.+?\)/g;

function waitForElem(selector) {
  return new Promise((resolve) => {
    // if element exists from the start, return it
    if (document.querySelector(selector)) {
      return resolve(document.querySelector(selector));
    }

    // if not, keep track of document.body, return element as soon as it appears
    const observer = new MutationObserver((_mutations) => {
      if (document.querySelector(selector)) {
        observer.disconnect();
        resolve(document.querySelector(selector));
      }
    });

    // If you get "parameter 1 is not of type 'Node'" error, see https://stackoverflow.com/a/77855838/492336
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  });
}

async function hideRatingsInGamesList() {
  console.count('func runs');
  const gamesList = await waitForElem('#games-list');

  const observer = new MutationObserver((mutationList, _observer) => {
    for (const mutation of mutationList) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        const newNode = mutation.addedNodes.item(0);

        // // "DIV" || "#text Fetching games..."
        if (newNode.nodeName === 'DIV') {
          const span = newNode.getElementsByTagName('span')[0];

          span.textContent = span.textContent.replace(ratingRegex, '');
        }
      }
    }
  });

  observer.observe(gamesList, {
    attributes: true,
    childList: true,
    subtree: true,
  });
}

// only run this when a Analyse request is sent
function hideRatingsInBoard() {
  const profiles = document.getElementsByClassName('profile');

  const observer = new MutationObserver((mutationList) => {
    for (const mutation of mutationList) {
      console.log('mutation', mutation);

      if (mutation.type === 'childList') {
        // username & rating appears
        mutation.target.textContent = mutation.target.textContent.replace(ratingRegex, '');
        observer.disconnect();
      }
    }
  });

  for (profile of profiles) {
    observer.observe(profile, {
      attributes: true,
      childList: true,
      subtree: true,
    });
  }
}

browser.runtime.onMessage.addListener((message) => {
  if (message === 'add-board-observer') {
    hideRatingsInBoard();
  }
});
