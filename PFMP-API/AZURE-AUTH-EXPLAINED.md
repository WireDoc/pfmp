# PFMP Azure AD Authentication Flow Documentation

## Complete Authentication Architecture

### Option 1: Traditional Azure AD Flow (What you're used to)
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Azure AD      │    │   PFMP API      │
│   (Browser)     │    │   (EntraID)     │    │   (Backend)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                       │                       │
        │ 1. Click "Login"      │                       │
        │                       │                       │
        │ 2. Redirect to Azure  │                       │
        ├──────────────────────>│                       │
        │   /oauth2/v2.0/authorize                     │
        │                       │                       │
        │ 3. User Login         │                       │
        │   (Enter credentials) │                       │
        │                       │                       │
        │ 4. Auth Code          │                       │
        │<──────────────────────┤                       │
        │   (Callback URL)      │                       │
        │                       │                       │
        │ 5. Send Code to API   │                       │
        ├───────────────────────┼──────────────────────>│
        │                       │                       │
        │                       │ 6. Exchange Code      │
        │                       │<──────────────────────┤
        │                       │   for Tokens          │
        │                       │                       │
        │                       │ 7. ID Token + Claims  │
        │                       ├──────────────────────>│
        │                       │                       │
        │                       │                       │ 8. Validate Token
        │                       │                       │    Create/Find User
        │                       │                       │    Generate JWT
        │                       │                       │
        │ 9. PFMP JWT Token     │                       │
        │<──────────────────────┼───────────────────────┤
        │                       │                       │
        │ 10. API Calls         │                       │
        ├───────────────────────┼──────────────────────>│
        │    (Bearer JWT)       │                       │
```

### Option 2: Client-Side Token Flow (What I implemented)
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Azure AD      │    │   PFMP API      │
│   (MSAL.js)     │    │   (EntraID)     │    │   (Backend)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                       │                       │
        │ 1. MSAL Login         │                       │
        ├──────────────────────>│                       │
        │                       │                       │
        │ 2. Azure ID Token     │                       │
        │<──────────────────────┤                       │
        │                       │                       │
        │ 3. Send Azure Token   │                       │
        ├───────────────────────┼──────────────────────>│
        │   to /auth/azure-login│                       │
        │                       │                       │ 4. Validate Azure Token
        │                       │                       │    Extract Claims
        │                       │                       │    Create/Find User
        │                       │                       │    Generate PFMP JWT
        │                       │                       │
        │ 5. PFMP JWT Token     │                       │
        │<──────────────────────┼───────────────────────┤
        │                       │                       │
        │ 6. API Calls          │                       │
        ├───────────────────────┼──────────────────────>│
        │    (Bearer JWT)       │                       │
```

## Azure App Registration Details

### What Gets Created in Your Azure Portal

1. **App Registration Entry**
   - Name: "PFMP-API" (or whatever you specify)
   - Application ID: `12345678-1234-1234-1234-123456789abc`
   - Tenant: Your Azure AD tenant

2. **Authentication Configuration**
   - Platform: Web + SPA (Single Page Application)
   - Redirect URIs: `http://localhost:5173/auth/callback`
   - Implicit grant: ID tokens enabled

3. **API Permissions**
   - Microsoft Graph: User.Read, OpenID, Profile, Email
   - Status: Admin consent may be required

4. **Certificates & Secrets**
   - Client Secret: Generated for server-to-server auth
   - Expires: 1 year (configurable)

### View Your App Registration

After running the script, you can see it at:
- **Azure Portal** → **Azure Active Directory** → **App registrations**
- Look for "PFMP-API" in the list
- Click on it to see all configuration details

## Frontend Integration Examples

### Using MSAL.js (Microsoft's Official Library)

```javascript
// Install: npm install @azure/msal-browser @azure/msal-react

import { PublicClientApplication } from '@azure/msal-browser';

const msalConfig = {
  auth: {
    clientId: 'your-client-id-from-azure', // From App Registration
    authority: 'https://login.microsoftonline.com/your-tenant-id',
    redirectUri: 'http://localhost:3000' // Your frontend URL
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false
  }
};

const msalInstance = new PublicClientApplication(msalConfig);

// Login function
async function loginWithAzure() {
  try {
    // 1. Trigger Azure AD login popup
    const loginResponse = await msalInstance.loginPopup({
      scopes: ['openid', 'profile', 'email', 'User.Read'],
    });
    
    console.log('Azure login successful:', loginResponse);
    
    // 2. Get the ID token from Azure
    const azureIdToken = loginResponse.idToken;
    
    // 3. Send Azure token to your PFMP API
    const pfmpResponse = await fetch('/api/auth/azure-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        azureToken: azureIdToken
      })
    });
    
    const pfmpAuth = await pfmpResponse.json();
    
    // 4. Store PFMP JWT token
    localStorage.setItem('pfmpToken', pfmpAuth.token);
    
    // 5. Use PFMP token for API calls
    const userProfile = await fetch('/api/users/me', {
      headers: {
        'Authorization': `Bearer ${pfmpAuth.token}`
      }
    });
    
    console.log('PFMP authentication complete');
    
  } catch (error) {
    console.error('Login failed:', error);
  }
}
```

### Alternative: Direct Azure AD Integration

If you prefer the traditional server-side flow (like you're used to), I can modify the implementation:

```csharp
// In Program.cs - Traditional OIDC setup
builder.Services.AddAuthentication(options =>
{
    options.DefaultScheme = "Cookies";
    options.DefaultChallengeScheme = "AzureAD";
})
.AddCookie("Cookies")
.AddOpenIdConnect("AzureAD", options =>
{
    options.Authority = "https://login.microsoftonline.com/your-tenant-id/v2.0";
    options.ClientId = "your-client-id";
    options.ClientSecret = "your-client-secret";
    options.ResponseType = "code";
    options.CallbackPath = "/signin-oidc";
    
    // After successful auth, redirect user back to frontend
    options.Events.OnTokenValidated = async context =>
    {
        // Create user in database
        // Generate PFMP JWT
        // Redirect with token
    };
});
```

## Let's Test the Setup

Would you like me to:

1. **Run the PowerShell script** to create the actual Azure App Registration?
2. **Show you how to find it** in your Azure Portal?
3. **Modify the implementation** to use traditional server-side OIDC flow?
4. **Create a simple frontend example** to test the authentication?

The key point is: **Yes, you will see a real App Registration in your Azure AD**, and it works exactly like other Azure AD integrations you've used before. The difference is just in how the frontend handles the tokens (client-side vs server-side).

Which approach would you prefer, and would you like me to help set it up?