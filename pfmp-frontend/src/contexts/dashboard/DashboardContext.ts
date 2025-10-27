import { createContext } from 'react';

export interface DashboardContextType {
  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;
}

export const DashboardContext = createContext<DashboardContextType | undefined>(undefined);
