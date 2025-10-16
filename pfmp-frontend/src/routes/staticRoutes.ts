import type { ComponentType, LazyExoticComponent } from 'react';
import { lazyWithPreload } from '../utils/lazyWithPreload';

type RouteComponent = ComponentType | LazyExoticComponent<ComponentType>;

const DashboardLegacyLazy = lazyWithPreload(() => import('../views/DashboardPage'));
const OnboardingLazy = lazyWithPreload(() => import('../views/OnboardingPage'));
const DashboardWave4Lazy = lazyWithPreload(() => import('../views/DashboardWave4'));
const LoginLazy = lazyWithPreload(() => import('../views/LoginPlaceholder'));
const NotFoundLazy = lazyWithPreload(() => import('../views/NotFoundPage'));

export interface StaticRouteDef {
  id: string;
  path?: string;
  index?: boolean;
  Component: RouteComponent;
}

export const staticChildRoutes: StaticRouteDef[] = [
  { id: 'root-index', index: true, Component: DashboardLegacyLazy },
  { id: 'root-alias', path: '', Component: DashboardLegacyLazy },
  { id: 'onboarding', path: 'onboarding', Component: OnboardingLazy },
  { id: 'dashboard-wave4', path: 'dashboard', Component: DashboardWave4Lazy },
  { id: 'login', path: 'login', Component: LoginLazy },
];

export const StaticNotFoundComponent: RouteComponent = NotFoundLazy;
