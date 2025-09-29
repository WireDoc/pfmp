# Fix Azure AD App Registration for SPA Authentication
# This script ensures your app is properly configured as a Single-Page Application

Write-Host "🔧 Fixing Azure AD App Registration for SPA Authentication..." -ForegroundColor Cyan

try {
    # Connect to Microsoft Graph
    $context = Get-MgContext
    if (-not $context) {
        Write-Host "Connecting to Microsoft Graph..." -ForegroundColor Yellow
        Connect-MgGraph -Scopes "Application.ReadWrite.All"
    }

    $clientId = "efe3c2da-c4bb-45ff-b85b-e965de54f910"
    
    # Get the application
    Write-Host "Finding application with Client ID: $clientId" -ForegroundColor Yellow
    $app = Get-MgApplication -Filter "appId eq '$clientId'"
    
    if (-not $app) {
        Write-Host "❌ Application not found with Client ID: $clientId" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Found application: $($app.DisplayName)" -ForegroundColor Green
    Write-Host "Current configuration:" -ForegroundColor Yellow
    Write-Host "  - Object ID: $($app.Id)" -ForegroundColor Cyan
    Write-Host "  - Sign-in audience: $($app.SignInAudience)" -ForegroundColor Cyan
    
    # Configure SPA platform with correct redirect URIs
    $spaRedirectUris = @(
        "http://localhost:3000/auth/redirect",
        "http://localhost:3000",
        "http://localhost:5173/auth/redirect",
        "http://localhost:5173"
    )
    
    # Configure the application for SPA
    $updateParams = @{
        Spa = @{
            RedirectUris = $spaRedirectUris
        }
        # Ensure it's configured for public client flows
        IsFallbackPublicClient = $true
        # Set sign-in audience to support personal Microsoft accounts
        SignInAudience = "AzureADandPersonalMicrosoftAccount"
    }
    
    Write-Host "Updating application configuration..." -ForegroundColor Yellow
    Update-MgApplication -ApplicationId $app.Id -BodyParameter $updateParams
    
    # Verify the update
    $updatedApp = Get-MgApplication -ApplicationId $app.Id
    
    Write-Host "✅ Application updated successfully!" -ForegroundColor Green
    Write-Host "Updated configuration:" -ForegroundColor Yellow
    Write-Host "  - Sign-in audience: $($updatedApp.SignInAudience)" -ForegroundColor Cyan
    Write-Host "  - Fallback public client: $($updatedApp.IsFallbackPublicClient)" -ForegroundColor Cyan
    Write-Host "  - SPA Redirect URIs:" -ForegroundColor Cyan
    $updatedApp.Spa.RedirectUris | ForEach-Object { Write-Host "    - $_" -ForegroundColor White }
    
    Write-Host "`n🎉 Azure AD App Registration is now properly configured for SPA authentication!" -ForegroundColor Green
    Write-Host "Wait 2-3 minutes for changes to propagate, then try signing in again." -ForegroundColor Yellow
    
} catch {
    Write-Host "Error updating application: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}