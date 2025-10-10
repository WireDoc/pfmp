# PFMP Authentication System

## Overview

The PFMP (Personal Financial Management Platform) authentication system provides both Azure EntraID (Azure AD) OIDC integration and local username/password authentication with a developer bypass mode for testing.

## Phase 1 (Oct 2025) Direction

- **Primary Path:** Focus on local user accounts (registration + JWT login) for onboarding rebuild.
- **Azure SSO:** Deferred until after Phase 1; existing tenant/client identifiers remain preserved under `appsettings.Development.json` for future activation.
- **Developer Bypass:** Keep disabled (`Development:BypassAuthentication = false`) except for targeted frontend work.

> ℹ️ The Azure app registration TenantId (`90c3ba91-a0c4-4816-9f8f-beeefbfc33d2`) and ClientId (`efe3c2da-c4bb-45ff-b85b-e965de54f910`) are already stored in configuration. Only the client secret will need re-seeding when we re-enable Azure login.

## Features

- ✅ **Azure EntraID OIDC Integration** - Single Sign-On with Microsoft accounts
- ✅ **Local Authentication** - Username/password registration and login
- ✅ **JWT Token Management** - Secure API access with JWT tokens
- ✅ **Developer Bypass Mode** - Skip authentication during development
- ✅ **Account Linking** - Link existing local accounts with Azure accounts
- ✅ **User Management** - Registration, profile management, and security features

## Configuration

### 1. Basic Configuration

Update your `appsettings.Development.json`:

```json
{
  "JWT": {
    "SecretKey": "PFMP-Dev-Secret-Key-Change-In-Production-2025-Must-Be-At-Least-32-Characters-Long",
    "Issuer": "PFMP-API",
    "Audience": "PFMP-Frontend",
    "ExpirationMinutes": 60
  },
  "Development": {
    "BypassAuthentication": true,
    "SeedTestData": true,
    "DefaultTestUserId": 1
  },
  "Authentication": {
    "RegistrationEnabled": true,
    "RequireEmailConfirmation": false
  }
}
```

### 2. Azure AD Setup (Production)

#### Automated Setup (Recommended)

Run the PowerShell setup script:

```powershell
# Basic setup
.\Setup-AzureAD.ps1

# Custom configuration
.\Setup-AzureAD.ps1 -AppName "PFMP-Production" -RedirectUri "https://yourapp.com/auth/callback" -Production
```

#### Manual Setup

1. Go to [Azure Portal](https://portal.azure.com) → Azure Active Directory → App registrations
2. Click "New registration"
3. Configure:
   - **Name**: PFMP-API
   - **Supported account types**: Accounts in this organizational directory only
   - **Redirect URI**: Web → `http://localhost:5173/auth/callback`

4. After creation, note:
   - Application (client) ID
   - Directory (tenant) ID

5. Go to "Certificates & secrets" → "New client secret"
6. Copy the secret value immediately

7. Update `appsettings.json`:

```json
{
  "AzureAD": {
    "TenantId": "your-tenant-id",
    "ClientId": "your-client-id",
    "ClientSecret": "your-client-secret",
    "Domain": "yourdomain.onmicrosoft.com",
    "CallbackPath": "/signin-oidc"
  }
}
```

## API Endpoints

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/login` | Local username/password login | No |
| POST | `/api/auth/register` | Create new local account | No |
| POST | `/api/auth/azure-login` | Authenticate with Azure token | No |
| POST | `/api/auth/refresh` | Refresh JWT token | No |
| POST | `/api/auth/logout` | Revoke refresh token | Yes |
| GET | `/api/auth/me` | Get current user info | Yes |
| POST | `/api/auth/link-azure` | Link Azure account to local | Yes |
| GET | `/api/auth/config` | Get auth configuration | No |

### Request/Response Examples

#### Local Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "isSuccess": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2025-09-26T14:30:00Z",
  "user": {
    "userId": 1,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "isSetupComplete": true
  }
}
```

#### Azure Authentication
```http
POST /api/auth/azure-login
Content-Type: application/json

{
  "azureToken": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9..."
}
```

## Developer Bypass Mode

For development and testing, set `Development:BypassAuthentication` to `true`:

```json
{
  "Development": {
    "BypassAuthentication": true,
    "DefaultTestUserId": 1
  }
}
```

When enabled:
- All authentication endpoints return success
- JWT validation is skipped
- Default test user is used for protected endpoints
- Useful for frontend development and testing

## Security Features

### JWT Token Security
- **Symmetric key signing** with configurable secret
- **Short expiration** (default 60 minutes)
- **Secure claims** including user ID and setup status
- **Refresh token support** (ready for implementation)

### Password Security
- **BCrypt hashing** with work factor 12
- **Failed attempt tracking** to prevent brute force
- **Minimum length requirements** (8 characters default)

### Azure AD Security
- **OIDC compliance** with standard flows
- **Token validation** against Azure signing keys
- **Issuer verification** to prevent token reuse
- **Expiration checking** for security

## Integration Examples

### Frontend (React/Vue/Angular)

```javascript
// Login with local credentials
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

const { token, user } = await loginResponse.json();

// Store token for API requests
localStorage.setItem('authToken', token);

// Use token in subsequent requests
const apiResponse = await fetch('/api/users/profile', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Azure AD Integration (MSAL)

```javascript
import { PublicClientApplication } from '@azure/msal-browser';

const msalConfig = {
  auth: {
    clientId: 'your-client-id',
    authority: 'https://login.microsoftonline.com/your-tenant-id'
  }
};

const msalInstance = new PublicClientApplication(msalConfig);

// Get Azure token and exchange for API token
const azureToken = await msalInstance.acquireTokenSilent({
  scopes: ['openid', 'profile', 'email'],
  account: account
});

const apiResponse = await fetch('/api/auth/azure-login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ azureToken: azureToken.accessToken })
});
```

## Troubleshooting

### Common Issues

1. **JWT Secret Key Too Short**
   - Error: JWT secret must be at least 32 characters
   - Solution: Update `JWT:SecretKey` in configuration

2. **Azure AD Token Validation Failed**
   - Check `AzureAD:TenantId` is correct
   - Verify app registration permissions
   - Ensure token is not expired

3. **CORS Issues**
   - Update CORS policy in Program.cs
   - Add frontend URL to allowed origins

4. **Database Connection**
   - Verify PostgreSQL connection string
   - Check database exists and user has permissions

### Debug Mode

Enable detailed logging in `appsettings.Development.json`:

```json
{
  "Logging": {
    "LogLevel": {
      "PFMP_API.Services.AuthenticationService": "Debug",
      "Microsoft.AspNetCore.Authentication": "Debug"
    }
  }
}
```

## Production Checklist

- [ ] Change `JWT:SecretKey` to a secure random value (64+ characters)
- [ ] Set `Development:BypassAuthentication` to `false`
- [ ] Configure proper Azure AD redirect URIs
- [ ] Store client secret securely (Azure Key Vault)
- [ ] Enable HTTPS and update CORS policies
- [ ] Set up proper logging and monitoring
- [ ] Test authentication flows thoroughly
- [ ] Review and minimize Azure AD permissions

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   PFMP API      │    │   Azure AD      │
│   (React/Vue)   │    │                 │    │   (EntraID)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                       │                       │
        │ 1. Login Request      │                       │
        ├──────────────────────>│                       │
        │                       │ 2. Validate Creds    │
        │                       ├───────────────────────>│
        │                       │ 3. User Claims       │
        │                       │<───────────────────────┤
        │ 4. JWT Token          │                       │
        │<──────────────────────┤                       │
        │                       │                       │
        │ 5. API Requests       │                       │
        ├──────────────────────>│                       │
        │   (Bearer Token)      │                       │
```

## Next Steps

1. **Implement Refresh Tokens** - Add persistent token storage and rotation
2. **Add Email Verification** - Implement email confirmation for registration
3. **Multi-Factor Authentication** - Add TOTP/SMS verification
4. **Role-Based Access Control** - Implement user roles and permissions
5. **Audit Logging** - Track authentication events and security incidents