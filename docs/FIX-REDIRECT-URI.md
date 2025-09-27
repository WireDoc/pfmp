# Add Redirect URI to Azure AD App Registration

You need to add the redirect URI to your Azure AD App Registration. Here are the steps:

## Azure Portal Method (Manual)

1. **Navigate to Azure Portal**
   - Go to https://portal.azure.com
   - Sign in with your Microsoft Developer Program account

2. **Find Your App Registration**
   - Search for "App registrations" in the top search bar
   - Click on "App registrations"
   - Find your app: "PFMP-API" (Client ID: efe3c2da-c4bb-45ff-b85b-e965de54f910)

3. **Add Redirect URI**
   - Click on your app registration
   - In the left menu, click "Authentication"
   - Under "Platform configurations", click "Add a platform"
   - Select "Single-page application (SPA)"
   - Add these redirect URIs:
     - `http://localhost:3000/auth/redirect`
     - `http://localhost:3000` (fallback)
     - `http://localhost:5173/auth/redirect` (Vite default port)
     - `http://localhost:5173` (fallback)

4. **Save Changes**
   - Click "Configure" to save the SPA platform
   - The redirect URIs should now be listed

## PowerShell Method (Automated)

Alternatively, run this PowerShell script to add the redirect URIs automatically:

```powershell
# Add-RedirectUris.ps1
# Run this from W:\pfmp\PFMP-API directory

# Connect to Microsoft Graph
Connect-MgGraph -Scopes "Application.ReadWrite.All"

# Your App Registration Object ID (you'll need to get this from Azure Portal)
$appId = "efe3c2da-c4bb-45ff-b85b-e965de54f910"

# Get the application
$app = Get-MgApplication -Filter "appId eq '$appId'"

if ($app) {
    Write-Host "Found application: $($app.DisplayName)"
    
    # Current redirect URIs
    $currentUris = $app.Spa.RedirectUris
    Write-Host "Current Redirect URIs: $($currentUris -join ', ')"
    
    # New redirect URIs to add
    $newUris = @(
        "http://localhost:3000/auth/redirect",
        "http://localhost:3000",
        "http://localhost:5173/auth/redirect", 
        "http://localhost:5173"
    )
    
    # Combine existing and new URIs (remove duplicates)
    $allUris = ($currentUris + $newUris) | Sort-Object | Get-Unique
    
    # Update the application
    $spaSettings = @{
        RedirectUris = $allUris
    }
    
    Update-MgApplication -ApplicationId $app.Id -Spa $spaSettings
    
    Write-Host "✅ Successfully updated redirect URIs:"
    $allUris | ForEach-Object { Write-Host "  - $_" }
} else {
    Write-Host "❌ Application not found with Client ID: $appId"
}
```

## After Adding Redirect URI

Once you've added the redirect URI, your authentication should work! The frontend is already configured correctly.

## Current Frontend Configuration

Your MSAL config is set up correctly in `/src/config/authConfig.ts`:
- **Redirect URI**: `http://localhost:3000/auth/redirect` 
- **Client ID**: `efe3c2da-c4bb-45ff-b85b-e965de54f910`
- **Tenant ID**: `90c3ba91-a0c4-4816-9f8f-beeefbfc33d2`

The issue is just that Azure AD doesn't recognize this redirect URI as valid for your app yet.

## Test After Update

1. Add the redirect URI using either method above
2. Wait 2-3 minutes for Azure AD to propagate the changes
3. Refresh your browser page at `http://localhost:3000`
4. Click "Sign In with Microsoft Account"
5. You should now be redirected to Microsoft authentication successfully!

Which method would you prefer to use to add the redirect URI?