import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export interface LoadingContextType {
  isLoading: boolean;
  message: string;
  showLoading: (msg?: string) => void;
  hideLoading: () => void;
}

export const LoadingContext = createContext<LoadingContextType>({
  isLoading: false,
  message: 'Procesando...',
  showLoading: () => {},
  hideLoading: () => {},
});

type LoadingHandler = {
  show: (msg?: string) => void;
  hide: () => void;
};

let globalLoadingHandler: LoadingHandler | null = null;

export const registerLoadingHandler = (handler: LoadingHandler | null) => {
  globalLoadingHandler = handler;
};

export const getGlobalLoadingHandler = () => globalLoadingHandler;

export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loadingCount, setLoadingCount] = useState<number>(0);
  const [message, setMessage] = useState<string>('Procesando...');

  const showLoading = useCallback((msg: string = 'Procesando...') => {
    setMessage(msg);
    setLoadingCount((prev) => prev + 1);
  }, []);

  const hideLoading = useCallback(() => {
    setLoadingCount((prev) => Math.max(0, prev - 1));
  }, []);

  useEffect(() => {
    registerLoadingHandler({
      show: (msg) => showLoading(msg),
      hide: () => hideLoading(),
    });
    return () => {
      registerLoadingHandler(null);
    };
  }, [showLoading, hideLoading]);

  return (
    <LoadingContext.Provider
      value={{
        isLoading: loadingCount > 0,
        message,
        showLoading,
        hideLoading,
      }}
    >
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoading = (): LoadingContextType => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading debe ser usado dentro de un LoadingProvider');
  }
  return context;
};
