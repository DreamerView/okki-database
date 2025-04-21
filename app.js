// main.js
const { app,screen, BrowserWindow,ipcMain } = require('electron');
const electronAPI = require("./backend/knex");


const sqliteShow = () => {
    const display = screen.getPrimaryDisplay();
    const { width, height } = display.workAreaSize;
    const showWindow = new BrowserWindow({
          width: width,
          height: height,
          icon: __dirname + '/frontend/logo.png',
          webPreferences: {
            defaultEncoding: 'UTF-8',
            nodeIntegration: true,
            contextIsolation: false,
          },
          autoHideMenuBar: true,
          frame: false
      });

      showWindow.setMinimumSize(800, 800);

      ipcMain.on('toggle-maximize', () => {
        if (showWindow.isMaximized()) {
          showWindow.unmaximize(); // Если окно находится в максимизированном режиме, вернуть его к обычному размеру
        } else {
          showWindow.maximize(); // В противном случае максимизировать окно
        }
      });

      ipcMain.on('hide-window', () => {
        showWindow.minimize();
      });
      ipcMain.on('close-window', () => {
        showWindow.close();
      });
  
      showWindow.loadFile('frontend/interface.html');
      showWindow.maximize();
      // showWindow.webContents.openDevTools();

  };

function createWindow() {
  sqliteShow();
  electronAPI();
}

// This method will be called when Electron has finished initialization and is ready to create browser windows.
app.on('ready', createWindow);