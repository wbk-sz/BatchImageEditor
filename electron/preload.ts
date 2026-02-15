const { contextBridge, ipcRenderer, webUtils } = require('electron');

const api = {
    selectImages: () => ipcRenderer.invoke('dialog:openFile'),
    selectDirectory: () => ipcRenderer.invoke('dialog:selectDirectory'),
    readImage: (path: string) => ipcRenderer.invoke('read-image', path),
    getApiPort: () => ipcRenderer.invoke('get-api-port'),
    getPathForFile: (file: File) => {
        // Even with contextIsolation: false, webUtils is the most reliable way in modern Electron
        try {
            if (webUtils && webUtils.getPathForFile) {
                return webUtils.getPathForFile(file);
            }
        } catch (e) {
            console.warn('webUtils.getPathForFile failed:', e);
        }
        // Fallback
        // @ts-ignore
        return file.path || '';
    },
};

// Expose API
if (process.contextIsolated) {
    contextBridge.exposeInMainWorld('electron', api);
} else {
    // @ts-ignore
    window.electron = api;
}
