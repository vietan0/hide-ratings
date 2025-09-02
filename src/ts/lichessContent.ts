import browser from 'webextension-polyfill';

function connect() {
  const port = browser.runtime.connect({ name: 'my-lichess-content-script-port' });
  port.postMessage({ command: 'requestPgn' });

  port.onDisconnect.addListener(() => {
    connect();
  });

  port.onMessage.addListener(async (message) => {
    const msgTyped = message as { pgn: string };

    if (msgTyped.pgn) {
      const textarea = document.getElementById('form3-pgn') as HTMLTextAreaElement;

      if (textarea) {
        textarea.value = msgTyped.pgn;
        const requestComputerAnalysisInput = document.getElementById('form3-analyse') as HTMLInputElement;

        if (!requestComputerAnalysisInput.disabled) {
          requestComputerAnalysisInput.checked = true;
        }

        const submitBtn = document.querySelector<HTMLButtonElement>('.submit.button');
        submitBtn!.click();
      }
    }
  });
}

connect();
