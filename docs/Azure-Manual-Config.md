## Azure AD App Registration Manual Configuration

The automated scripts are encountering API issues. Please follow these manual steps in the Azure Portal:

### Step 1: Navigate to Azure Portal
1. Go to **portal.azure.com**
2. Sign in with your Azure account
3. Navigate to **Azure Active Directory** > **App registrations**
4. Find and click on **PFMP-API** (Client ID: efe3c2da-c4bb-45ff-b85b-e965de54f910)

### Step 2: Configure Authentication Platform
1. Click on **Authentication** in the left menu
2. Under **Platform configurations**, if you see "Single-page application":
   - Click on it to edit
   - Ensure these redirect URIs are listed:
     - `http://localhost:3000`
     - `http://localhost:3000/`
3. If "Single-page application" is not present:
   - Click **Add a platform**
   - Select **Single-page application**
   - Add redirect URIs:
     - `http://localhost:3000`
     - `http://localhost:3000/`
   - Click **Configure**

### Step 3: Update Application Manifest (CRITICAL)
1. Click on **Manifest** in the left menu
2. Find the following properties and update them:
   ```json
   "accessTokenAcceptedVersion": 2,
   "signInAudience": "AzureADandPersonalMicrosoftAccount",
   ```
3. **Click Save** at the top of the manifest editor

### Step 4: Verify API Permissions
1. Click on **API permissions** in the left menu
2. Ensure **Microsoft Graph > User.Read** is present
3. If not, click **Add a permission** > **Microsoft Graph** > **Delegated permissions** > **User.Read** > **Add permissions**

### Step 5: Test Configuration
After making these changes:
1. Wait 2-3 minutes for propagation
2. Try signing in with your personal Microsoft account
3. The error should be resolved

### Current App Details
- **Client ID**: efe3c2da-c4bb-45ff-b85b-e965de54f910
- **Tenant ID**: 90c3ba91-a0c4-4816-9f8f-beeefbfc33d2

### Key Changes Made
- **accessTokenAcceptedVersion**: Changed from `null` to `2`
- **signInAudience**: Changed from `AzureADMyOrg` to `AzureADandPersonalMicrosoftAccount`
- **Platform**: Added Single-page application with correct redirect URIs

These changes will enable the app to accept both work and personal Microsoft accounts.