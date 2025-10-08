import React from 'react';

type LazyFactory<TProps> = () => Promise<{ default: React.ComponentType<TProps> }>;

interface PreloadableLazy<TProps> extends React.LazyExoticComponent<React.ComponentType<TProps>> {
  preload: () => Promise<{ default: React.ComponentType<TProps> }>;
}

// A wrapper around React.lazy that exposes a preload() method and can auto-preload in tests.
export function lazyWithPreload<TProps>(factory: LazyFactory<TProps>): PreloadableLazy<TProps> {
  const LazyComp = React.lazy(factory) as PreloadableLazy<TProps>;
  LazyComp.preload = factory;
  // If running under Vitest, eagerly kick off the load to avoid hanging Suspense in tests.
  if (import.meta.env.MODE === 'test') {
    void LazyComp.preload();
  }
  return LazyComp;
}

// Convenience bulk preload if needed later
export function preloadAll(list: Array<{ preload?: () => Promise<unknown> }>) {
  return Promise.all(list.map(item => (item.preload ? item.preload() : Promise.resolve(undefined))));
}