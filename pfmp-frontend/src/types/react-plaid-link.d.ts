// Temporary stub for react-plaid-link to unblock compilation.
// TODO: Install real dependency and replace with proper types.
declare module 'react-plaid-link' {
  import * as React from 'react';
  interface PlaidLinkOnSuccess {
    (public_token: string, metadata?: any): void | Promise<void>;
  }
  interface PlaidLinkOnExit {
    (err: any, metadata: any): void;
  }
  interface PlaidLinkOptions {
    token: string;
    onSuccess: PlaidLinkOnSuccess;
    onExit?: PlaidLinkOnExit;
    [key: string]: any;
  }
  interface PlaidLinkHook {
    open: () => void;
    ready: boolean;
    error?: Error;
  }
  export function usePlaidLink(config: PlaidLinkOptions): PlaidLinkHook;
}
