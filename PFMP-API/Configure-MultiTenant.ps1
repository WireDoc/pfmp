# Configure App for Multi-Tenant Support
# This allows any Microsoft account to sign in to your app

Write-Host "🔐 Configuring app for multi-tenant support..." -ForegroundColor Cyan

try {
    # Connect to Microsoft Graph (you should already be connected from the previous script)
    $context = Get-MgContext
    if (-not $context) {
        Write-Host "Connecting to Microsoft Graph..." -ForegroundColor Yellow
        Connect-MgGraph -Scopes "Application.ReadWrite.All", "Directory.ReadWrite.All"
    }

    # Read the existing app configuration
    if (Test-Path "azure-ad-config.json") {
        $config = Get-Content "azure-ad-config.json" | ConvertFrom-Json
        $clientId = $config.ClientId
    } else {
        Write-Host "❌ azure-ad-config.json not found. Please run Setup-AzureAD.ps1 first." -ForegroundColor Red
        exit 1
    }

    Write-Host "Updating app registration: $clientId" -ForegroundColor Yellow

    # Update the app to support multi-tenant
    $updateParams = @{
        SignInAudience = "AzureADandPersonalMicrosoftAccount"  # This allows both organizational and personal Microsoft accounts
    }

    Update-MgApplication -ApplicationId $clientId -BodyParameter $updateParams

    Write-Host "✅ App configured for multi-tenant support!" -ForegroundColor Green
    Write-Host "Now any Microsoft account can sign in to your app." -ForegroundColor White
    Write-Host "Personal Microsoft accounts will work directly without invitation." -ForegroundColor Cyan

    # Update the config file
    $config.SignInAudience = "AzureADandPersonalMicrosoftAccount"
    $config.MultiTenant = $true
    $config.UpdatedAt = Get-Date
    
    $config | ConvertTo-Json | Out-File "azure-ad-config.json" -Encoding UTF8
    Write-Host "`n💾 Configuration updated in azure-ad-config.json" -ForegroundColor Cyan

} catch {
    Write-Host "❌ Error configuring multi-tenant support: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}