# PFMP Azure AD App Registration Script
# This script creates and configures an Azure AD App Registration for PFMP with OIDC

param(
    [Parameter(Mandatory = $false)]
    [string]$AppName = "PFMP-API",
    
    [Parameter(Mandatory = $false)]
    [string]$RedirectUri = "http://localhost:5173/auth/callback",
    
    [Parameter(Mandatory = $false)]
    [string]$ApiUri = "http://localhost:5000",
    
    [Parameter(Mandatory = $false)]
    [switch]$Production
)

# Check if Microsoft Graph PowerShell module is installed
$authModule = Get-Module -ListAvailable -Name Microsoft.Graph.Authentication
$appModule = Get-Module -ListAvailable -Name Microsoft.Graph.Applications

if (-not $authModule -or -not $appModule) {
    Write-Host "Installing Microsoft Graph PowerShell module..." -ForegroundColor Yellow
    Install-Module Microsoft.Graph.Authentication, Microsoft.Graph.Applications -Scope CurrentUser -Force
}

# Import required modules (force reimport to avoid version conflicts)
Write-Host "Loading Microsoft Graph modules..." -ForegroundColor Blue
Import-Module Microsoft.Graph.Applications -Force
Import-Module Microsoft.Graph.Authentication -Force

try {
    # Connect to Microsoft Graph
    Write-Host "Connecting to Microsoft Graph..." -ForegroundColor Blue
    Connect-MgGraph -Scopes "Application.ReadWrite.All", "Directory.Read.All"

    # Get tenant information
    $tenant = Get-MgOrganization
    $tenantId = $tenant.Id
    $domain = $tenant.VerifiedDomains | Where-Object { $_.IsDefault -eq $true } | Select-Object -ExpandProperty Name

    Write-Host "Tenant ID: $tenantId" -ForegroundColor Green
    Write-Host "Domain: $domain" -ForegroundColor Green

    # Check if app already exists
    $existingApp = Get-MgApplication -Filter "displayName eq '$AppName'"
    
    if ($existingApp) {
        Write-Host "App '$AppName' already exists. Updating configuration..." -ForegroundColor Yellow
        $app = $existingApp
    } else {
        Write-Host "Creating new App Registration: $AppName" -ForegroundColor Blue
        
        # Create the application
        $appParams = @{
            DisplayName = $AppName
            Description = "PFMP Personal Financial Management Platform API"
            SignInAudience = "AzureADMyOrg"
            RequiredResourceAccess = @(
                @{
                    ResourceAppId = "00000003-0000-0000-c000-000000000000" # Microsoft Graph
                    ResourceAccess = @(
                        @{
                            Id = "e1fe6dd8-ba31-4d61-89e7-88639da4683d" # User.Read
                            Type = "Scope"
                        },
                        @{
                            Id = "37f7f235-527c-4136-accd-4a02d197296e" # OpenId
                            Type = "Scope"
                        },
                        @{
                            Id = "14dad69e-099b-42c9-810b-d002981feec1" # Profile
                            Type = "Scope"
                        },
                        @{
                            Id = "64a6cdd6-aab1-4aaf-94b8-3cc8405e90d0" # Email
                            Type = "Scope"
                        }
                    )
                }
            )
            Web = @{
                RedirectUris = @($RedirectUri, "$ApiUri/signin-oidc")
                ImplicitGrantSettings = @{
                    EnableIdTokenIssuance = $true
                    EnableAccessTokenIssuance = $false
                }
            }
            Spa = @{
                RedirectUris = @($RedirectUri)
            }
        }

        $app = New-MgApplication @appParams
    }

    # Create a client secret
    Write-Host "Creating client secret..." -ForegroundColor Blue
    $secretParams = @{
        ApplicationId = $app.Id
        PasswordCredential = @{
            DisplayName = "PFMP API Secret"
            EndDateTime = (Get-Date).AddMonths(12) # 1 year expiration
        }
    }
    
    $secret = Add-MgApplicationPassword @secretParams

    # Create service principal if it doesn't exist
    $servicePrincipal = Get-MgServicePrincipal -Filter "appId eq '$($app.AppId)'"
    if (-not $servicePrincipal) {
        Write-Host "Creating service principal..." -ForegroundColor Blue
        $servicePrincipal = New-MgServicePrincipal -AppId $app.AppId
    }

    # Output configuration
    Write-Host "`n" -ForegroundColor Green
    Write-Host "=== PFMP Azure AD Configuration ===" -ForegroundColor Green
    Write-Host "App Registration created successfully!" -ForegroundColor Green
    Write-Host "`n"
    
    Write-Host "Configuration for appsettings.json:" -ForegroundColor Cyan
    Write-Host "=================================" -ForegroundColor Cyan
    
    $config = @"
{
  "AzureAD": {
    "TenantId": "$tenantId",
    "ClientId": "$($app.AppId)",
    "ClientSecret": "$($secret.SecretText)",
    "Domain": "$domain",
    "CallbackPath": "/signin-oidc"
  }
}
"@
    
    Write-Host $config -ForegroundColor White
    
    # Save configuration to file
    $configPath = "azure-ad-config.json"
    $config | Out-File -FilePath $configPath -Encoding UTF8
    Write-Host "`nConfiguration saved to: $configPath" -ForegroundColor Yellow
    
    # Additional information
    Write-Host "`n" -ForegroundColor Green
    Write-Host "Additional Information:" -ForegroundColor Cyan
    Write-Host "=====================" -ForegroundColor Cyan
    Write-Host "App Registration ID: $($app.Id)" -ForegroundColor White
    Write-Host "Application ID (Client ID): $($app.AppId)" -ForegroundColor White
    Write-Host "Tenant ID: $tenantId" -ForegroundColor White
    Write-Host "Authority URL: https://login.microsoftonline.com/$tenantId" -ForegroundColor White
    Write-Host "Token Endpoint: https://login.microsoftonline.com/$tenantId/oauth2/v2.0/token" -ForegroundColor White
    Write-Host "OIDC Metadata: https://login.microsoftonline.com/$tenantId/v2.0/.well-known/openid_configuration" -ForegroundColor White
    
    Write-Host "`n" -ForegroundColor Green
    Write-Host "Next Steps:" -ForegroundColor Cyan
    Write-Host "==========" -ForegroundColor Cyan
    Write-Host "1. Copy the AzureAD configuration to your appsettings.json or appsettings.Development.json" -ForegroundColor White
    Write-Host "2. Set 'Development:BypassAuthentication' to false in production" -ForegroundColor White
    Write-Host "3. Configure your frontend application to use the Client ID: $($app.AppId)" -ForegroundColor White
    Write-Host "4. Test the authentication flow" -ForegroundColor White
    
    if ($Production) {
        Write-Host "`n" -ForegroundColor Red
        Write-Host "PRODUCTION SECURITY REMINDERS:" -ForegroundColor Red
        Write-Host "==============================" -ForegroundColor Red
        Write-Host "- Change JWT:SecretKey to a secure random value" -ForegroundColor Yellow
        Write-Host "- Set Development:BypassAuthentication to false" -ForegroundColor Yellow
        Write-Host "- Update redirect URIs to production URLs" -ForegroundColor Yellow
        Write-Host "- Store client secret securely (Azure Key Vault recommended)" -ForegroundColor Yellow
        Write-Host "- Review and minimize required permissions" -ForegroundColor Yellow
    }

} catch {
    Write-Error "Failed to create Azure AD App Registration: $($_.Exception.Message)"
    Write-Host "Make sure you have the required permissions:" -ForegroundColor Yellow
    Write-Host "- Application Developer role or higher" -ForegroundColor Yellow
    Write-Host "- Application.ReadWrite.All permission" -ForegroundColor Yellow
} finally {
    # Disconnect from Microsoft Graph
    Disconnect-MgGraph -ErrorAction SilentlyContinue
}

Write-Host "`nScript completed!" -ForegroundColor Green