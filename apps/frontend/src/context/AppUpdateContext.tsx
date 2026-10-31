import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { apiClient } from '../api/client';
import type { AppUpdateDTO } from '@finowork/shared-types';
import { ApkInstaller, type DownloadProgress } from '../plugins/apkInstaller';

export type UseAppUpdaterReturn = AppUpdateContextType;

export interface AppUpdateContextType {
  isChecking: boolean;
  updateAvailable: boolean;
  latestUpdate: AppUpdateDTO | null;
  currentVersion: string;
  currentBuild: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  canPostpone: boolean;
  daysRemaining: number;
  isStrictlyMandatory: boolean;
  isDownloading: boolean;
  downloadProgress: number;
  errorMessage: string | null;
  startUpdate: () => Promise<void>;
  postponeUpdate: () => Promise<void>;
  checkForUpdates: (manual?: boolean) => Promise<void>;
}

const AppUpdateContext = createContext<AppUpdateContextType | undefined>(undefined);

const SNOOZE_HOURS = 12; // Horas de tranquilidad tras pulsar "Actualizar más tarde"

export const AppUpdateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isChecking, setIsChecking] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [latestUpdate, setLatestUpdate] = useState<AppUpdateDTO | null>(null);
  const [currentVersion, setCurrentVersion] = useState<string>('1.0.8');
  const [currentBuild, setCurrentBuild] = useState<number>(9);
  const [isOpen, setIsOpen] = useState(false);
  const [canPostpone, setCanPostpone] = useState(true);
  const [daysRemaining, setDaysRemaining] = useState(3);
  const [isStrictlyMandatory, setIsStrictlyMandatory] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const progressListenerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (progressListenerRef.current) {
        progressListenerRef.current.remove?.();
      }
    };
  }, []);

  const checkForUpdates = useCallback(async (manual: boolean = false) => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
      return;
    }

    try {
      setIsChecking(true);
      setErrorMessage(null);

      const appInfo = await CapacitorApp.getInfo();
      const localVersion = appInfo.version || '1.0.7';
      const localBuild = parseInt(appInfo.build || '8', 10);

      setCurrentVersion(localVersion);
      setCurrentBuild(localBuild);

      const res = await apiClient.get<AppUpdateDTO[]>('/app-updates/latest', {
        params: { limit: 1 },
        skipGlobalLoading: true,
      });

      const latest = res.data?.[0];
      if (!latest || !latest.versionCode || !latest.apkUrl) {
        setUpdateAvailable(false);
        if (manual) {
          setErrorMessage('Tu aplicación FinoWork está al día.');
          setTimeout(() => setErrorMessage(null), 3000);
        }
        return;
      }

      setLatestUpdate(latest);

      if (latest.versionCode > localBuild) {
        setUpdateAvailable(true);

        const graceDays = latest.graceDays !== undefined && latest.graceDays !== null ? latest.graceDays : 3;
        const seenKey = `finowork_update_seen_${latest.versionCode}`;
        const snoozeKey = `finowork_update_snooze_${latest.versionCode}`;

        let firstSeenStr = (await Preferences.get({ key: seenKey })).value;
        if (!firstSeenStr) {
          firstSeenStr = new Date().toISOString();
          await Preferences.set({ key: seenKey, value: firstSeenStr });
        }

        const firstSeenTime = new Date(firstSeenStr).getTime();
        const deadlineTime = firstSeenTime + graceDays * 24 * 60 * 60 * 1000;
        const now = Date.now();
        const msRemaining = deadlineTime - now;
        const calculatedDaysRemaining = Math.max(0, Math.ceil(msRemaining / (24 * 60 * 60 * 1000)));

        setDaysRemaining(calculatedDaysRemaining);

        const expired = msRemaining <= 0;
        const strictlyMandatory = !!latest.mandatory && (graceDays === 0 || expired);

        setIsStrictlyMandatory(strictlyMandatory);
        setCanPostpone(!strictlyMandatory);

        if (manual) {
          setIsOpen(true);
        } else if (strictlyMandatory) {
          setIsOpen(true);
        } else {
          const snoozeStr = (await Preferences.get({ key: snoozeKey })).value;
          if (snoozeStr) {
            const snoozeTime = new Date(snoozeStr).getTime();
            const hoursSinceSnooze = (now - snoozeTime) / (1000 * 60 * 60);
            if (hoursSinceSnooze < SNOOZE_HOURS) {
              return;
            }
          }
          setIsOpen(true);
        }
      } else {
        setUpdateAvailable(false);
        if (manual) {
          setErrorMessage('Tu aplicación FinoWork ya está en la versión más reciente.');
          setTimeout(() => setErrorMessage(null), 3500);
        }
      }
    } catch (err: any) {
      console.warn('[AppUpdateContext] Error al comprobar actualización:', err);
      if (manual) {
        setErrorMessage('No se pudo contactar al servidor. Comprueba tu conexión.');
      }
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    checkForUpdates(false);
  }, [checkForUpdates]);

  const postponeUpdate = useCallback(async () => {
    if (!latestUpdate?.versionCode) {
      setIsOpen(false);
      return;
    }
    const snoozeKey = `finowork_update_snooze_${latestUpdate.versionCode}`;
    await Preferences.set({ key: snoozeKey, value: new Date().toISOString() });
    setIsOpen(false);
  }, [latestUpdate]);

  const startUpdate = useCallback(async () => {
    if (!latestUpdate?.apkUrl) {
      setErrorMessage('La URL de descarga no es válida.');
      return;
    }

    try {
      setIsDownloading(true);
      setDownloadProgress(0);
      setErrorMessage(null);

      if (progressListenerRef.current) {
        await progressListenerRef.current.remove?.();
      }

      progressListenerRef.current = await ApkInstaller.addListener(
        'downloadProgress',
        (progressInfo: DownloadProgress) => {
          setDownloadProgress(progressInfo.progress);
        }
      );

      await ApkInstaller.downloadAndInstall({ url: latestUpdate.apkUrl });
    } catch (err: any) {
      console.error('[AppUpdateContext] Error descargando APK:', err);
      setErrorMessage(err?.message || 'Error durante la descarga del instalador.');
    } finally {
      setIsDownloading(false);
    }
  }, [latestUpdate]);

  return (
    <AppUpdateContext.Provider
      value={{
        isChecking,
        updateAvailable,
        latestUpdate,
        currentVersion,
        currentBuild,
        isOpen,
        setIsOpen,
        canPostpone,
        daysRemaining,
        isStrictlyMandatory,
        isDownloading,
        downloadProgress,
        errorMessage,
        startUpdate,
        postponeUpdate,
        checkForUpdates,
      }}
    >
      {children}
    </AppUpdateContext.Provider>
  );
};

export const useAppUpdater = (): AppUpdateContextType => {
  const context = useContext(AppUpdateContext);
  if (!context) {
    throw new Error('useAppUpdater debe ser utilizado dentro de un AppUpdateProvider');
  }
  return context;
};
