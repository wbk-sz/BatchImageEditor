export interface IElectronAPI {
    selectImages: () => Promise<string[]>;
    selectDirectory: () => Promise<string | null>;
    readImage: (path: string) => Promise<string | null>;
    getPathForFile: (file: File) => string;
    getApiPort: () => Promise<number | null>;
}

declare global {
    interface Window {
        electron: IElectronAPI;
    }
}
