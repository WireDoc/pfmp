// Temporary stub for react-plaid-link to unblock compilation.
// TODO: Install real dependency and replace with proper types.
declare module 'react-plaid-link' {
  // Using unknown instead of any; callers can refine as needed.
  interface PlaidLinkOnSuccess {
    (public_token: string, metadata?: unknown): void | Promise<void>;
  }
  interface PlaidLinkOnExit {
    (err: unknown, metadata: unknown): void;
  }
  interface PlaidLinkOptions {
    token: string;
    onSuccess: PlaidLinkOnSuccess;
    onExit?: PlaidLinkOnExit;
    // Allow additional vendor-supplied configuration without strict typing yet.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  }
  interface PlaidLinkHook {
    open: () => void;
    ready: boolean;
    error?: Error;
  }
  export function usePlaidLink(config: PlaidLinkOptions): PlaidLinkHook;
}
