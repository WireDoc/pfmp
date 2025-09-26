# Manual Azure AD App Registration Guide

## Step-by-Step Manual Setup

Since you're using a personal Microsoft account, you'll need to create the App Registration manually through the Azure Portal.

### Prerequisites
- Azure subscription (free tier works fine)
- Access to Azure Portal at https://portal.azure.com

### Step 1: Create Azure AD Tenant (if needed)
If you don't have an Azure AD tenant:
1. Go to https://portal.azure.com
2. Search for "Azure Active Directory"
3. If you see "No directory found", click "Create a directory"
4. Choose "Azure Active Directory" and follow the setup

### Step 2: Create App Registration

1. **Navigate to Azure Active Directory**
   - Go to https://portal.azure.com
   - Search for "Azure Active Directory" or "Entra ID"
   - Click on "Azure Active Directory"

2. **Go to App Registrations**
   - In the left sidebar, click "App registrations"
   - Click "New registration"

3. **Configure Basic Settings**
   - **Name**: `PFMP-API`
   - **Supported account types**: 
     - Choose "Accounts in this organizational directory only" (single tenant)
     - OR "Accounts in any organizational directory" (multi-tenant) if you want broader access
   - **Redirect URI**: 
     - Platform: `Web`
     - URL: `http://localhost:5173/auth/callback`
   - Click "Register"

4. **Note Important Values** (save these!)
   - **Application (client) ID**: Copy this value
   - **Directory (tenant) ID**: Copy this value (from Overview page)

### Step 3: Create Client Secret

1. **Go to Certificates & secrets**
   - In your app registration, click "Certificates & secrets"
   - Click "New client secret"

2. **Configure Secret**
   - **Description**: `PFMP API Secret`
   - **Expires**: Choose 12 months (or 24 months)
   - Click "Add"

3. **Copy Secret Value**
   - **IMPORTANT**: Copy the secret VALUE immediately (not the ID)
   - You won't be able to see it again!

### Step 4: Configure API Permissions

1. **Go to API permissions**
   - Click "API permissions" in the left sidebar
   - Click "Add a permission"

2. **Add Microsoft Graph permissions**
   - Click "Microsoft Graph"
   - Click "Delegated permissions"
   - Search for and select these permissions:
     - `User.Read` (should be there by default)
     - `openid`
     - `profile` 
     - `email`
   - Click "Add permissions"

3. **Grant Admin Consent** (optional but recommended)
   - Click "Grant admin consent for [your directory]"
   - Click "Yes" to confirm

### Step 5: Configure Authentication

1. **Go to Authentication**
   - Click "Authentication" in the left sidebar
   - Under "Platform configurations", you should see your Web redirect URI

2. **Add SPA Redirect URI** (for frontend)
   - Click "Add a platform"
   - Choose "Single-page application"
   - Add redirect URI: `http://localhost:3000/auth/callback`
   - Add another: `http://localhost:5173/auth/callback`
   - Click "Configure"

3. **Enable ID tokens**
   - Under "Implicit grant and hybrid flows"
   - Check "ID tokens (used for implicit and hybrid flows)"
   - Click "Save"

### Step 6: Update Your Configuration

Create or update your `appsettings.Development.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=pfmp_dev;Username=pfmp_user;Password=pfmp_pass"
  },
  "JWT": {
    "SecretKey": "PFMP-Dev-Secret-Key-Change-In-Production-2025-Must-Be-At-Least-32-Characters-Long",
    "Issuer": "PFMP-API",
    "Audience": "PFMP-Frontend",
    "ExpirationMinutes": 60
  },
  "AzureAD": {
    "TenantId": "YOUR_TENANT_ID_FROM_STEP_2",
    "ClientId": "YOUR_CLIENT_ID_FROM_STEP_2", 
    "ClientSecret": "YOUR_CLIENT_SECRET_FROM_STEP_3",
    "Domain": "yourdomain.onmicrosoft.com",
    "CallbackPath": "/signin-oidc"
  },
  "Development": {
    "BypassAuthentication": false,
    "SeedTestData": true,
    "DefaultTestUserId": 1
  },
  "Authentication": {
    "RegistrationEnabled": true
  }
}
```

### Step 7: Test the Setup

After updating your configuration:

1. **Build and run your API**
   ```powershell
   dotnet build
   dotnet run
   ```

2. **Test the auth config endpoint**
   ```powershell
   curl http://localhost:5000/api/auth/config
   ```

   Should return:
   ```json
   {
     "bypassAuthentication": false,
     "azureEnabled": true,
     "localAuthEnabled": true,
     "registrationEnabled": true
   }
   ```

### Troubleshooting

- **"No directory found"**: You need to create an Azure AD tenant first
- **"Insufficient privileges"**: You need to be an admin of the Azure AD tenant
- **"Invalid client secret"**: Make sure you copied the VALUE not the ID

### What's Next?

Once this is set up:
1. Your app will appear in Azure Portal under "App registrations" 
2. Users can sign in with their Microsoft work/school accounts
3. Your API will receive their identity claims (name, email, etc.)
4. You can build a frontend that authenticates users and calls your API

This gives you the same result as the PowerShell script - a working Azure AD integration where users authenticate with Microsoft and your app knows who they are!