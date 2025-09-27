# Check Current Redirect URIs in Azure AD App Registration
# Run this PowerShell script to see what redirect URIs are currently configured

Connect-MgGraph -Scopes "Application.Read.All"

$appId = "efe3c2da-c4bb-45ff-b85b-e965de54f910"
$app = Get-MgApplication -Filter "appId eq '$appId'"

if ($app) {
    Write-Host "Application: $($app.DisplayName)" -ForegroundColor Green
    Write-Host "Client ID: $($app.AppId)" -ForegroundColor Cyan
    Write-Host "Object ID: $($app.Id)" -ForegroundColor Cyan
    
    Write-Host "`nCurrently Configured Redirect URIs:" -ForegroundColor Yellow
    
    if ($app.Web.RedirectUris.Count -gt 0) {
        Write-Host "Web Platform:" -ForegroundColor Magenta
        $app.Web.RedirectUris | ForEach-Object { Write-Host "  - $_" }
    }
    
    if ($app.Spa.RedirectUris.Count -gt 0) {
        Write-Host "SPA Platform:" -ForegroundColor Magenta  
        $app.Spa.RedirectUris | ForEach-Object { Write-Host "  - $_" }
    }
    
    if ($app.PublicClient.RedirectUris.Count -gt 0) {
        Write-Host "Public Client Platform:" -ForegroundColor Magenta
        $app.PublicClient.RedirectUris | ForEach-Object { Write-Host "  - $_" }
    }
    
    if ($app.Web.RedirectUris.Count -eq 0 -and $app.Spa.RedirectUris.Count -eq 0 -and $app.PublicClient.RedirectUris.Count -eq 0) {
        Write-Host "  No redirect URIs configured!" -ForegroundColor Red
        Write-Host "  You need to add redirect URIs for the application to work." -ForegroundColor Yellow
    }
} else {
    Write-Host "Application not found!" -ForegroundColor Red
}