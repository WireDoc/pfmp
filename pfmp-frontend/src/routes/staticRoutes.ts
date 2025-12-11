import type { ComponentType, LazyExoticComponent } from 'react';
import { lazyWithPreload } from '../utils/lazyWithPreload';

type RouteComponent = ComponentType | LazyExoticComponent<ComponentType>;

const DashboardLegacyLazy = lazyWithPreload(() => import('../views/DashboardPage'));
const OnboardingLazy = lazyWithPreload(() => import('../views/OnboardingPage'));
const DashboardLazy = lazyWithPreload(() => import('../views/Dashboard'));
const LoginLazy = lazyWithPreload(() => import('../views/LoginPlaceholder'));
const NotFoundLazy = lazyWithPreload(() => import('../views/NotFoundPage'));
const NetWorthTimelineLazy = lazyWithPreload(() => import('../views/dashboard/NetWorthTimelineView'));
const SchedulerAdminLazy = lazyWithPreload(() => import('../views/admin/SchedulerAdminView'));
const ConnectionsSettingsLazy = lazyWithPreload(() => import('../views/settings/ConnectionsSettingsView'));

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
  { id: 'dashboard-wave4', path: 'dashboard', Component: DashboardLazy },
  { id: 'net-worth-timeline', path: 'dashboard/net-worth', Component: NetWorthTimelineLazy },
  { id: 'scheduler-admin', path: 'admin/scheduler', Component: SchedulerAdminLazy },
  { id: 'settings-connections', path: 'settings/connections', Component: ConnectionsSettingsLazy },
  { id: 'login', path: 'login', Component: LoginLazy },
];

export const StaticNotFoundComponent: RouteComponent = NotFoundLazy;
