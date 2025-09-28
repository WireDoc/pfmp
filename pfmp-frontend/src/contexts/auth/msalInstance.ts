import { PublicClientApplication } from '@azure/msal-browser';
import { msalConfig } from '../../config/authConfig';

// Single shared MSAL instance for the frontend.
export const msalInstance = new PublicClientApplication(msalConfig);
