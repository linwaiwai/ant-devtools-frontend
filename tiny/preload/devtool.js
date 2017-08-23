const ipcRenderer = require('electron').ipcRenderer;

window.sendToHost = function () {
  ipcRenderer.sendToHost.apply(ipcRenderer, arguments);
};

window.listenToHost = function () {
  ipcRenderer.on.apply(ipcRenderer, arguments);
};

window.listenToHostOnce = function () {
  ipcRenderer.once.apply(ipcRenderer, arguments);
};

ipcRenderer.setMaxListeners(0);

window.ondragover = () => false;
window.ondragleave = () => false;
window.ondrop = () => false;
