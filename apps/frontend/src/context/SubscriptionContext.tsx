import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import type { ReactNode } from 'react';
import { apiClient } from '../api/client';
import { AuthContext } from './AuthContext';
import type { MySubscriptionDTO, PlatformConfigDTO } from '@nutrideli/shared-types';

export interface SubscriptionContextType {
  subscription: MySubscriptionDTO | null;
  platformConfig: PlatformConfigDTO | null;
  exchangeRate: number;
  isLoading: boolean;
  isExpired: boolean;
  daysLeft: number;
  isReportModalOpen: boolean;
  setIsReportModalOpen: (val: boolean) => void;
  refreshSubscription: () => Promise<void>;
}

export const SubscriptionContext = createContext<SubscriptionContextType>({} as SubscriptionContextType);

export const SubscriptionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useContext(AuthContext);
  const [subscription, setSubscription] = useState<MySubscriptionDTO | null>(null);
  const [platformConfig, setPlatformConfig] = useState<PlatformConfigDTO | null>(null);
  const [exchangeRate, setExchangeRate] = useState<number>(36.5);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);

  const refreshSubscription = useCallback(async () => {
    if (!isAuthenticated || !user?.tenantId) {
      setIsLoading(false);
      return;
    }

    try {
      const [subRes, confRes] = await Promise.allSettled([
        apiClient.get<MySubscriptionDTO>('/superadmin/my-subscription'),
        apiClient.get<PlatformConfigDTO>('/superadmin/platform-config'),
      ]);

      if (subRes.status === 'fulfilled') {
        setSubscription(subRes.value.data);
      }
      if (confRes.status === 'fulfilled') {
        setPlatformConfig(confRes.value.data);
      }

      try {
        const rateRes = await apiClient.get<{ exchangeRateBs?: number; rate?: number }>('/settings/exchange-rate');
        const r = rateRes.data?.exchangeRateBs || rateRes.data?.rate;
        if (r) {
          setExchangeRate(Number(r));
        }
      } catch {
        // Fallback default exchange rate
      }
    } catch (err) {
      console.error('Error cargando suscripción:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.tenantId]);

  useEffect(() => {
    refreshSubscription();
  }, [refreshSubscription]);

  const isExpired = subscription?.isExpired ?? false;
  const daysLeft = subscription?.daysLeft ?? 0;

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        platformConfig,
        exchangeRate,
        isLoading,
        isExpired,
        daysLeft,
        isReportModalOpen,
        setIsReportModalOpen,
        refreshSubscription,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};
