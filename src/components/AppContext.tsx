'use client';

import { createContext, useContext } from 'react';

interface AppContextValue {
  /** Bumping this value tells pages to refetch their data. */
  refreshKey: number;
  refresh: () => void;
  adminName: string;
  adminWhatsapp: string;
  whatsappConfigured: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider = AppContext.Provider;

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within the app shell');
  return ctx;
}
