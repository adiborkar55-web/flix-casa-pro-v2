const { app, BrowserWindow, ipcMain, session } = require('electron');
const fs = require('fs');
const path = require('path');

let mainWindow;

const defaultState = {
  users: [
    { id: 'U-1047', device: 'iPhone 14 Pro', os: 'iOS 18.0', variant: 'Pro', status: 'Active', token: 'tok_1047', sessionActive: true, selected: false },
    { id: 'U-2381', device: 'Galaxy Tab S10', os: 'Android 14', variant: 'TV', status: 'Active', token: 'tok_2381', sessionActive: true, selected: false },
    { id: 'U-6732', device: 'Windows Laptop', os: 'Windows 11', variant: 'Standard', status: 'Blocked', token: 'tok_6732', sessionActive: false, selected: false },
    { id: 'U-9124', device: 'OnePlus 12', os: 'Android 15', variant: 'Pro', status: 'Active', token: 'tok_9124', sessionActive: true, selected: false },
    { id: 'U-4501', device: 'Amazon Fire TV', os: 'FireOS 8', variant: 'TV', status: 'Blocked', token: 'tok_4501', sessionActive: false, selected: false },
    { id: 'U-5568', device: 'MacBook Air', os: 'macOS 14', variant: 'Standard', status: 'Active', token: 'tok_5568', sessionActive: true, selected: false }
  ],
  globalControls: {
    proDownloadEnabled: true,
    providerEndpoint: 'https://api.flixcasa.local/providers',
    providerOverrideEnabled: true,
    emergencyIsolation: false
  },
  notices: []
};

function getStatePath() {
  return path.join(app.getPath('userData'), 'flix-casa-admin-state.json');
}

function readState() {
  try {
    const filePath = getStatePath();
    if (!fs.existsSync(filePath)) {
      writeState(defaultState);
      return JSON.parse(JSON.stringify(defaultState));
    }

    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      ...JSON.parse(JSON.stringify(defaultState)),
      ...parsed,
      users: Array.isArray(parsed.users) && parsed.users.length ? parsed.users : defaultState.users,
      globalControls: { ...defaultState.globalControls, ...(parsed.globalControls || {}) }
    };
  } catch (error) {
    console.warn('Unable to read admin state, falling back to defaults:', error);
    return JSON.parse(JSON.stringify(defaultState));
  }
}

function writeState(snapshot) {
  const state = {
    ...JSON.parse(JSON.stringify(defaultState)),
    ...(snapshot || {}),
    updatedAt: new Date().toISOString()
  };

  fs.writeFileSync(getStatePath(), JSON.stringify(state, null, 2));
  return state;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1380,
    height: 960,
    minWidth: 980,
    minHeight: 720,
    backgroundColor: '#07111f',
    title: 'Flix Casa Admin Panel',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'admin.html'));

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('admin:state-load', readState());
  });
}

const chromeUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36';
session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
  details.requestHeaders['User-Agent'] = chromeUserAgent;
  callback({ requestHeaders: details.requestHeaders });
});
session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
  callback({ responseHeaders: { ...details.responseHeaders, 'Access-Control-Allow-Origin': ['*'], 'Access-Control-Allow-Headers': ['*'] } });
});

ipcMain.on('admin:get-state', (event) => {
  event.reply('admin:state-load', readState());
});

ipcMain.on('admin:save-state', (event, statePayload) => {
  const saved = writeState(statePayload || readState());
  event.reply('admin:state-sync', saved);
});

ipcMain.on('admin:push-notice', (event, payload) => {
  const state = readState();
  const noticeEntry = {
    title: payload?.title || 'System Notice',
    message: payload?.message || '',
    target: payload?.target || 'all',
    selectedIds: Array.isArray(payload?.selectedIds) ? payload.selectedIds : [],
    sentAt: new Date().toISOString()
  };

  state.notices = [noticeEntry, ...(state.notices || [])].slice(0, 20);
  writeState(state);

  console.log('[Admin Broadcast]', noticeEntry);
  event.reply('admin:notice-sent', { ok: true, notice: noticeEntry });
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
