function connectToBackground() {
  port = browser.runtime.connect({ name: 'my-lichess-content-script-port' });
  port.postMessage({ command: 'requestPgn' });

  port.onMessage.addListener(async (message) => {
    if (message.pgn) {
      const textarea = document.getElementById('form3-pgn');
      textarea.value = message.pgn;
      const requestComputerAnalysisInput = document.getElementById('form3-analyse');

      if (!requestComputerAnalysisInput.disabled) {
        requestComputerAnalysisInput.checked = true;
      }

      const submitBtn = document.querySelector('.submit.button');
      submitBtn.click();
    }
  });
}

connectToBackground();
