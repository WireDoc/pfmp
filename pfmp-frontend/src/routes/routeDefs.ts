// Central route definitions for Wave 1
// Naming keeps path tokens consistent and enables future helper generation.

import type { ComponentType } from 'react';
export interface AppRouteModule { default: ComponentType<unknown>; }
export interface AppRoute {
  id: string;
  path: string;
  protected?: boolean;
  lazyImport?: () => Promise<AppRouteModule>;
}

export const ROUTES: AppRoute[] = [
  { id: 'root', path: '/', protected: true, lazyImport: () => import('../views/DashboardPage') },
  { id: 'onboarding', path: '/onboarding', protected: true, lazyImport: () => import('../views/OnboardingPage') },
  { id: 'login', path: '/login', protected: false, lazyImport: () => import('../views/LoginPlaceholder') },
  { id: 'notfound', path: '*', protected: false, lazyImport: () => import('../views/NotFoundPage') },
];

export function buildRoute(id: string): string {
  const r = ROUTES.find(r => r.id === id);
  if (!r) throw new Error(`Unknown route id: ${id}`);
  return r.path;
}
