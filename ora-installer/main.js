const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const os = require('os');

function createWindow() {
  const win = new BrowserWindow({
    width: 480,
    height: 360,
    icon: path.join(__dirname, 'ORA.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, 
      nodeIntegration: false
    }
  });
  win.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();
});