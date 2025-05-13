const { contextBridge, shell } = require('electron');
const os = require('os');
const https = require('https');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

contextBridge.exposeInMainWorld('oraInstaller', {
  platform: os.platform(),
  arch: os.arch(),
  installDriver: () => {
    const is64 = os.arch() === 'x64';
    const zipUrl = is64
      ? 'https://github.com/P3rs0nal/ICSI499/releases/download/v1.0.0/VBCABLE_Driver_Pack45.zip'
      : 'https://github.com/P3rs0nal/ICSI499/releases/download/v1.0.0/VBCable_MACDriver_Pack108.zip';

    const zipPath = path.join(os.tmpdir(), 'ora_driver.zip');
    const file = fs.createWriteStream(zipPath);
    https.get(zipUrl, response => {
      response.pipe(file);
      file.on('finish', () => {
        file.close(() => {
          const zip = new AdmZip(zipPath);
          const extractPath = path.join(os.tmpdir(), 'ora_driver_unzipped');
          zip.extractAllTo(extractPath, true);
          shell.openPath(extractPath);
        });
      });
    });
  }
});