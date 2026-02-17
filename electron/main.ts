const { app, BrowserWindow, ipcMain, dialog, protocol, net, Menu, MenuItemConstructorOptions, shell } = require('electron');
import path from 'path';
import { spawn, ChildProcess, exec } from 'child_process';
import { pathToFileURL } from 'url';
import fs from 'fs';
import os from 'os';
import util from 'util';

const execAsync = util.promisify(exec);

// Setup file logging for Electron
let logFile: string | null = null;

function log(message: string) {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} - ${message}\n`;

    // Lazy init logFile
    if (!logFile) {
        try {
            // Accessing app.getPath might fail if too early or app undefined?
            // But we need to try.
            if (app) {
                logFile = path.join(app.getPath('documents'), 'batch_image_editor_electron_debug.log');
            } else {
                console.log("App not defined yet: " + message);
                return;
            }
        } catch (e) {
            console.log("Failed to get documents path: " + message);
            return;
        }
    }

    try {
        if (logFile) fs.appendFileSync(logFile, logMessage);
    } catch (e) {
        // Fallback to console if file write fails
        console.log(message);
    }
    // Also log to console for dev
    console.log(message);
}

function logError(message: string, error?: any) {
    const timestamp = new Date().toISOString();
    const errorMessage = error ? `${message} Error: ${error.stack || error}\n` : `${message}\n`;
    const logLine = `${timestamp} - ERROR - ${errorMessage}`;

    if (!logFile && app) {
        try {
            logFile = path.join(app.getPath('documents'), 'batch_image_editor_electron_debug.log');
        } catch (e) { }
    }

    try {
        if (logFile) fs.appendFileSync(logFile, logLine);
    } catch (e) {
        console.error(message, error);
    }
    console.error(message, error);
}

// Log startup wrapped in try/catch to avoid crash if app is undefined
try {
    log("Electron main process started.");
} catch (e) { console.error("Startup log failed", e); }

let mainWindow: BrowserWindow | null;
let backendProcess: ChildProcess | null = null;
let backendPort: number | null = null;

// Register protocol for handling local file access
protocol.registerSchemesAsPrivileged([
    { scheme: 'media', privileges: { secure: true, supportFetchAPI: true, standard: true } }
]);

// Create minimal menu
const createMenu = () => {
    const template: Electron.MenuItemConstructorOptions[] = [
        {
            label: 'File',
            submenu: [
                { role: 'quit' }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'toggleDevTools', label: 'Toggle Developer Tools' }
            ]
        },
        {
            label: 'Promotion',
            submenu: [
                {
                    label: 'developer',
                    click: async () => {
                        await shell.openExternal('https://x.com/WBK_SZ');
                    }
                }
            ]
        }
    ];
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
    log("Custom menu set: File > Quit only");
    return menu;
};

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: true, // Enable nodeIntegration for local file access ease
            contextIsolation: false, // Disable isolation to keep valid File.path in renderer
            webSecurity: false, // Optional: verify if strictly needed, but helpful for local media loading
            sandbox: false,
        },
    });

    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:5173');
        // mainWindow.webContents.openDevTools(); // Hidden by default
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Intercept close event to ensure backend stops
    mainWindow.on('close', async (e) => {
        if (!isQuitting && backendProcess && !isBackendStopping) {
            e.preventDefault();
            log("Window close intercepted, stopping backend...");
            await stopBackend();
            log("Backend stopped, forcing exit...");
            app.exit(0);
        }
    });
}

const startBackend = () => {
    if (backendProcess) return;

    log(`SKIP_BACKEND env var: ${process.env.SKIP_BACKEND}`);
    if (process.env.SKIP_BACKEND) {
        log("Skipping backend spawn (SKIP_BACKEND is set)");
        return;
    }

    let backendPath = '';
    let args: string[] = [];

    if (app.isPackaged) {
        // Production: Run embedded python with app.py
        const pythonExe = path.join(process.resourcesPath, 'backend', 'python_embed', 'python.exe');
        const backendScript = path.join(process.resourcesPath, 'backend', 'app.py');

        backendPath = pythonExe;
        args = [backendScript];

        log(`Checking python path: ${pythonExe} - Exists: ${fs.existsSync(pythonExe)}`);
        log(`Checking script path: ${backendScript} - Exists: ${fs.existsSync(backendScript)}`);

        if (!fs.existsSync(pythonExe) || !fs.existsSync(backendScript)) {
            logError('Backend components not found.', { python: pythonExe, script: backendScript });
            dialog.showErrorBox('Backend Error', `Failed to locate backend components.\nPython: ${pythonExe}\nScript: ${backendScript}`);
            return;
        }
    } else {
        // Development: Run python script
        backendPath = 'python';
        // Fix path: dist-electron -> root -> backend -> app.py is ../backend/app.py
        args = [path.join(__dirname, '../backend/app.py')];
    }

    log(`Starting backend: ${backendPath} ${args.join(' ')}`);

    try {
        if (app.isPackaged) {
            backendProcess = spawn(backendPath, args, {
                cwd: path.dirname(backendPath), // Set CWD to exe directory
                detached: false,
                windowsHide: true,
                // Add env to ensure stdout isn't buffered if important
                env: { ...process.env, PYTHONUNBUFFERED: '1' }
            });
        } else {
            // Development: Use stdio pipe to capture stdout
            backendProcess = spawn(backendPath, args, {
                stdio: ['ignore', 'pipe', 'pipe']
            });
        }
    } catch (e: any) {
        dialog.showErrorBox('Backend Start Error', `Failed to spawn backend process:\n${e.message}`);
    }

    if (backendProcess) {
        // Capture stdout to find PORT
        if (backendProcess.stdout) {
            backendProcess.stdout.on('data', (data) => {
                const output = data.toString();
                log(`Backend Output: ${output.trim()}`);

                // Parse PORT:{number}
                const portMatch = output.match(/PORT:(\d+)/);
                if (portMatch) {
                    const port = parseInt(portMatch[1], 10);
                    backendPort = port;
                    log(`Backend Port Discovered: ${port}`);
                }
            });
        }

        if (backendProcess.stderr) {
            backendProcess.stderr.on('data', (data) => {
                log(`Backend Error Output: ${data.toString()}`);
            });
        }

        backendProcess.on('error', (err) => {
            logError('Failed to start backend:', err);
            if (app.isPackaged) {
                dialog.showErrorBox('Backend Error', `Failed to start backend process:\n${err.message}`);
            }
        });

        backendProcess.on('close', (code) => {
            log(`Backend process exited with code ${code}`);
            backendProcess = null;
            backendPort = null;
        });
    }
};

let isBackendStopping = false;

const stopBackend = async () => {
    if (!backendProcess || isBackendStopping) return;
    isBackendStopping = true;
    log("Stopping backend...");

    // 1. Try graceful shutdown via API
    if (backendPort) {
        try {
            const http = require('http');
            const options = {
                hostname: '127.0.0.1',
                port: backendPort,
                path: '/shutdown',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            await new Promise<void>((resolve) => {
                const req = http.request(options, (res: any) => {
                    log(`Shutdown request status: ${res.statusCode}`);
                    resolve();
                });

                req.on('error', (e: any) => {
                    log(`Shutdown request failed: ${e.message}`);
                    resolve();
                });

                // Set a timeout for the request itself
                req.setTimeout(1000, () => {
                    log("Shutdown request timed out");
                    req.destroy();
                    resolve();
                });

                req.end();
            });
        } catch (e: any) {
            log(`Error processing shutdown: ${e.message}`);
        }
    }

    // 2. Force kill after a short delay (now awaited) to ensure it's gone
    await new Promise<void>(async (resolve) => {
        // Wait a bit for graceful shutdown to have a chance
        await new Promise(r => setTimeout(r, 500));

        if (backendProcess) {
            try {
                if (process.platform === 'win32') {
                    // Force kill process tree on Windows AND WAIT FOR IT
                    log("Executing taskkill...");
                    await execAsync(`taskkill /pid ${backendProcess.pid} /f /t`);
                    log("Taskkill executed successfully");
                } else {
                    backendProcess.kill();
                    log("Sent SIGTERM to backend");
                }
            } catch (e: any) {
                // Ignore error if process not found (already gone)
                log(`Kill result: ${e.message}`);
            }
            backendProcess = null;
            backendPort = null;
        }
        resolve();
    });
}

app.whenReady().then(() => {
    log("App ready, creating menu...");

    // Debug Dump (Moved inside whenReady to ensure app/path availability)
    const debugDumpPath = path.join(app.getPath('documents'), 'startup_dump.txt');
    try {
        fs.appendFileSync(debugDumpPath, `\n--- STARTUP (whenReady) ${new Date().toISOString()} ---\n`);
        fs.appendFileSync(debugDumpPath, `App Path: ${app.getAppPath()}\n`);
        fs.appendFileSync(debugDumpPath, `Resources Path: ${process.resourcesPath}\n`);
        fs.appendFileSync(debugDumpPath, `Exec Path: ${process.execPath}\n`);
    } catch (e) { console.error("Failed to write startup dump", e); }

    createMenu();
    startBackend();

    ipcMain.handle('read-image', async (event, filePath) => {
        try {
            const imageBitmap = fs.readFileSync(filePath);
            const base64Image = Buffer.from(imageBitmap).toString('base64');
            // Determine mime type based on extension (simple check)
            const ext = path.extname(filePath).toLowerCase();
            let mimeType = 'image/png';
            if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
            else if (ext === '.webp') mimeType = 'image/webp';
            else if (ext === '.gif') mimeType = 'image/gif';

            return `data:${mimeType};base64,${base64Image}`;
        } catch (error: any) {
            logError('Error reading image:', error);
            return null;
        }
    });

    ipcMain.handle('dialog:openFile', async () => {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            properties: ['openFile', 'multiSelections'],
            filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'tif', 'svg', 'ico', 'pdf', 'pptx'] }],
        });
        if (canceled) {
            return [];
        } else {
            return filePaths;
        }
    });

    ipcMain.handle('dialog:selectDirectory', async () => {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            properties: ['openDirectory'],
        });
        if (canceled) {
            return null;
        } else {
            return filePaths[0]; // Return the first selected directory path
        }
    });

    // Handler to get backend port
    ipcMain.handle('get-api-port', async () => {
        // Wait loop if port is not yet available (simple polling)
        let attempts = 0;
        while (backendPort === null && attempts < 20) {
            // Try to read from file if backendPort not set (e.g. debug mode with SKIP_BACKEND)
            if (process.env.SKIP_BACKEND) {
                try {
                    const portFile = path.resolve('backend.port');
                    if (fs.existsSync(portFile)) {
                        const portStr = fs.readFileSync(portFile, 'utf-8');
                        const port = parseInt(portStr.trim(), 10);
                        if (!isNaN(port)) {
                            backendPort = port;
                            log(`Backend Port Discovered from file: ${port}`);
                            break;
                        }
                    }
                } catch (e) {
                    // ignore
                }
            }

            await new Promise(resolve => setTimeout(resolve, 500));
            attempts++;
        }
        return backendPort;
    });

    protocol.handle('media', (request) => {
        const url = request.url;
        log('Media Protocol Request: ' + url);

        try {
            // Remove 'media://' prefix
            let pathSegments = url.replace('media://', '');

            // Handle URL decoding (spaces, special chars)
            const decodedPath = decodeURIComponent(pathSegments);

            // On Windows, if we get something like /C:/path..., remove the leading slash to make it C:/path...
            let safePath = decodedPath;
            if (process.platform === 'win32') {
                if (safePath.startsWith('/') && safePath.includes(':')) {
                    safePath = safePath.slice(1);
                }
            }

            log('Resolved File Path: ' + safePath);

            // Convert local file path to file:// URL for net.fetch
            const fileUrl = pathToFileURL(safePath).toString();
            log('Fetch URL: ' + fileUrl);

            return net.fetch(fileUrl);
        } catch (error) {
            logError('Failed to handle media protocol:', error);
            return new Response('Bad Request', { status: 400 });
        }
    });

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

let isQuitting = false;
app.on('before-quit', async (event) => {
    if (!isQuitting) {
        event.preventDefault();
        isQuitting = true;
        await stopBackend();
        app.quit(); // This triggers before-quit again, but isQuitting guards it
    }
});
