const { app, BrowserWindow ,ipcMain,shell} = require('electron');
const { autoUpdater } = require('electron-updater');

const os = require("os");
const fs = require("fs");
const url = require("url");
const path = require("path");
const computerName = os.hostname();

let mainWindow
let workerWindow;

async function createWindow() {
  mainWindow = new BrowserWindow({
    autoHideMenuBar: false,//TODO
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
    icon: __dirname + '/favicon.ico'
  })

  mainWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, `/dist/index.html`),
      protocol: "file:",
      slashes: true
    })
  );
  // Open the DevTools.
  //dsmainWindow.webContents.openDevTools()

  mainWindow.on('closed', function () {
    app.quit();
    // mainWindow = null;
    // workerWindow=null;
  });


  workerWindow = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
  });
  workerWindow.loadURL("file://" + __dirname + "/worker.html");
  workerWindow.hide();
  workerWindow.webContents.openDevTools();
  workerWindow.on("closed", () => {
      workerWindow = undefined;
  });

}

//
// Event handler for asynchronous incoming messages
ipcMain.on('asynchronous-message', (event, arg) => {
  event.sender.send('asynchronous-reply', computerName)
})

ipcMain.on("printPDF", (event, content) => {
  workerWindow.webContents.print({silent: true});
  workerWindow.webContents.send("printPDF", content);
});
ipcMain.on("readyToPrintPDF", (event) => {
  const pdfPath = path.join(os.tmpdir(), 'print.pdf');
  workerWindow.webContents.printToPDF({}).then((data)=> {
      fs.writeFile(pdfPath, data, function (error) {
          if (error) {
              throw error
          }
          //shell.openItem(pdfPath)
          event.sender.send('wrote-pdf', pdfPath)
      })
  }).catch((error) => {
     throw error;
  })

});
app.on('ready', createWindow)

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', function () {
  if (mainWindow === null) createWindow()
});

ipcMain.on('app_version', (event) => {
  event.sender.send('app_version', { version: app.getVersion() });
});

autoUpdater.on('update-available', () => {
  mainWindow.webContents.send('update_available');
});

autoUpdater.on('update-downloaded', () => {
  mainWindow.webContents.send('update_downloaded');
});
autoUpdater.checkForUpdatesAndNotify();

ipcMain.on('restart_app', () => {
  autoUpdater.quitAndInstall();
});
