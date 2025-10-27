import { useState } from 'react';
import type { ReactNode } from 'react';
import { DashboardContext } from './DashboardContext';

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(240);
  
  return (
    <DashboardContext.Provider value={{ sidebarWidth, setSidebarWidth }}>
      {children}
    </DashboardContext.Provider>
  );
}
