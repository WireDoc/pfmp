import React from 'react';

// A wrapper around React.lazy that exposes a preload() method and can auto-preload in tests.
export function lazyWithPreload<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  const importer = () => factory();
  const LazyComp = React.lazy(importer) as React.LazyExoticComponent<T> & { preload: () => Promise<any> };
  (LazyComp as any).preload = importer;
  // If running under Vitest, eagerly kick off the load to avoid hanging Suspense in tests.
  if ((import.meta as any).env?.MODE === 'test') {
    importer();
  }
  return LazyComp;
}

// Convenience bulk preload if needed later
export function preloadAll(list: Array<{ preload?: () => Promise<any> }>) {
  return Promise.all(list.map(l => l.preload ? l.preload() : Promise.resolve()));
}