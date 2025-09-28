import type { Configuration, PopupRequest, LogLevel } from '@azure/msal-browser';

/**
 * Configuration object to be passed to MSAL instance on creation.
 * For a full list of MSAL configuration parameters, visit:
 * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/configuration.md 
 */
export const msalConfig: Configuration = {
    auth: {
        clientId: 'efe3c2da-c4bb-45ff-b85b-e965de54f910', // Azure AD App Registration Client ID
        authority: 'https://login.microsoftonline.com/common', // Use 'common' for personal + work accounts
        // Alternative: Use tenant-specific if 'common' has issues
        // authority: 'https://login.microsoftonline.com/90c3ba91-a0c4-4816-9f8f-beeefbfc33d2',
        redirectUri: window.location.origin, // Updated to match SPA configuration
        postLogoutRedirectUri: window.location.origin, // Redirect after logout
    },
    cache: {
        cacheLocation: 'sessionStorage', // This configures where your cache will be stored
        storeAuthStateInCookie: false, // Set this to "true" if you are having issues on IE11 or Edge
    },
    system: {
        // allowNativeBroker: false, // Disables WAM Broker (property may not exist in current version)
        allowRedirectInIframe: true, // Allow redirects in iframe to fix CORS issues
        windowHashTimeout: 60000, // Increase timeout for popup window
        iframeHashTimeout: 60000, // Increase timeout for iframe
        loggerOptions: {
            loggerCallback: (level: LogLevel, message: string, containsPii: boolean) => {
                if (containsPii) {
                    return;
                }
                switch (level) {
                    case 0: // LogLevel.Error
                        console.error(message);
                        return;
                    case 1: // LogLevel.Warning
                        console.warn(message);
                        return;
                    case 2: // LogLevel.Info
                        console.info(message);
                        return;
                    case 3: // LogLevel.Verbose
                        console.debug(message);
                        return;
                    default:
                        console.log(message);
                }
            },
        },
    },
};

/**
 * Scopes you add here will be prompted for user consent during sign-in.
 * By default, MSAL.js will add OIDC scopes (openid, profile, email) to any login request.
 * For more information about OIDC scopes, visit: 
 * https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-permissions-and-consent#openid-connect-scopes
 */
export const loginRequest: PopupRequest = {
    scopes: ['User.Read'], // Microsoft Graph API scope to read user profile
    prompt: 'select_account', // Forces account selection dialog
};

/**
 * Add here the scopes to request when obtaining an access token for MS Graph API. For more information, see:
 * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/resources-and-scopes.md
 */
export const graphConfig = {
    graphMeEndpoint: 'https://graph.microsoft.com/v1.0/me',
    graphApiVersion: 'v1.0',
};

/**
 * PFMP API configuration for authenticated requests
 */
export const pfmpApiConfig = {
    baseUrl: 'http://localhost:5052/api',
    endpoints: {
        users: '/users',
        profile: '/profile',
        accounts: '/accounts',
        tasks: '/tasks',
        portfolio: '/portfolio',
        marketData: '/market-data',
    },
};

/**
 * Scopes needed for PFMP API access
 * These should match the scopes configured in your Azure AD App Registration
 */
export const pfmpApiScopes = {
    read: [`api://${msalConfig.auth.clientId}/user_impersonation`],
    write: [`api://${msalConfig.auth.clientId}/user_impersonation`],
};