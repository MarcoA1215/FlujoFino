import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';

export interface DownloadProgress {
  progress: number;
  downloaded: number;
  total: number;
}

export interface ApkInstallerPlugin {
  downloadAndInstall(options: { url: string }): Promise<{ success: boolean }>;
  canRequestPackageInstalls(): Promise<{ canInstall: boolean }>;
  openInstallSettings(): Promise<void>;
  addListener(
    eventName: 'downloadProgress',
    listenerFunc: (info: DownloadProgress) => void
  ): Promise<PluginListenerHandle>;
}

export const ApkInstaller = registerPlugin<ApkInstallerPlugin>('ApkInstaller');
