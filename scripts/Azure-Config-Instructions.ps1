# Azure AD App Registration Configuration Instructions
# Please follow these steps in the Azure Portal

Write-Host "Azure AD App Registration Configuration Required" -ForegroundColor Yellow
Write-Host "Please manually configure these settings in Azure Portal:" -ForegroundColor White
Write-Host ""

Write-Host "1. Go to portal.azure.com -> Azure Active Directory -> App registrations" -ForegroundColor Cyan
Write-Host "2. Find and select 'PFMP-API' (Client ID: efe3c2da-c4bb-45ff-b85b-e965de54f910)" -ForegroundColor Cyan
Write-Host ""

Write-Host "3. Go to 'Authentication' section:" -ForegroundColor Green
Write-Host "   - Confirm 'Single-page application' has these redirect URIs:" -ForegroundColor White
Write-Host "     • http://localhost:3000" -ForegroundColor Gray
Write-Host "     • http://localhost:3000/" -ForegroundColor Gray
Write-Host "     • http://localhost:3000/redirect" -ForegroundColor Gray
Write-Host ""

Write-Host "4. Go to 'Manifest' section:" -ForegroundColor Green
Write-Host "   - Find 'accessTokenAcceptedVersion' and change from null/1 to 2" -ForegroundColor White
Write-Host "   - Find 'signInAudience' and change to 'AzureADandPersonalMicrosoftAccount'" -ForegroundColor White
Write-Host "   - Click 'Save'" -ForegroundColor White
Write-Host ""

Write-Host "5. Go to 'API permissions':" -ForegroundColor Green
Write-Host "   - Confirm 'Microsoft Graph - User.Read' is present" -ForegroundColor White
Write-Host "   - If not present, click 'Add a permission' -> Microsoft Graph -> Delegated -> User.Read" -ForegroundColor White
Write-Host ""

Write-Host "After making these changes, wait 2-3 minutes then test the sign-in." -ForegroundColor Yellow
Write-Host ""

Write-Host "Current App Details:" -ForegroundColor Magenta
Write-Host "  Client ID: efe3c2da-c4bb-45ff-b85b-e965de54f910" -ForegroundColor White
Write-Host "  Tenant ID: 90c3ba91-a0c4-4816-9f8f-beeefbfc33d2" -ForegroundColor White
Write-Host ""

# Let's also show current configuration for reference
try {
    $clientId = "efe3c2da-c4bb-45ff-b85b-e965de54f910"
    $app = Get-MgApplication -Filter "appId eq '$clientId'"
    
    if ($app) {
        Write-Host "Current Azure AD Configuration:" -ForegroundColor Magenta
        Write-Host "  Access Token Version: $($app.AccessTokenAcceptedVersion)" -ForegroundColor White
        Write-Host "  Sign-in Audience: $($app.SignInAudience)" -ForegroundColor White
        Write-Host "  Public Client: $($app.IsFallbackPublicClient)" -ForegroundColor White
        
        if ($app.Spa) {
            Write-Host "  SPA Redirect URIs: $($app.Spa.RedirectUris -join ', ')" -ForegroundColor White
        }
    }
} catch {
    Write-Host "Could not retrieve current configuration." -ForegroundColor Yellow
}