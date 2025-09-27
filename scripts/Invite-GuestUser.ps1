# Invite Guest User to Azure AD Tenant
# This script invites your personal Microsoft account as a guest user

param(
    [Parameter(Mandatory=$true)]
    [string]$GuestEmail,
    
    [Parameter(Mandatory=$false)]
    [string]$DisplayName = ""
)

Write-Host "🔐 Inviting guest user to Azure AD tenant..." -ForegroundColor Cyan

try {
    # Connect to Microsoft Graph (you should already be connected from the previous script)
    $context = Get-MgContext
    if (-not $context) {
        Write-Host "Connecting to Microsoft Graph..." -ForegroundColor Yellow
        Connect-MgGraph -Scopes "User.Invite.All", "User.ReadWrite.All", "Directory.ReadWrite.All"
    }

    # Set display name if not provided
    if ([string]::IsNullOrEmpty($DisplayName)) {
        $DisplayName = $GuestEmail.Split('@')[0]
    }

    # Create invitation
    Write-Host "Creating invitation for: $GuestEmail" -ForegroundColor Yellow
    
    $invitationParams = @{
        InvitedUserEmailAddress = $GuestEmail
        InvitedUserDisplayName = $DisplayName
        InviteRedirectUrl = "https://portal.azure.com"
        SendInvitationMessage = $true
        InvitedUserMessageInfo = @{
            CustomizedMessageBody = "You've been invited to access the PFMP (Personal Financial Management Platform) application. Please accept this invitation to sign in with your Microsoft account."
        }
    }

    $invitation = New-MgInvitation @invitationParams
    
    Write-Host "✅ Invitation sent successfully!" -ForegroundColor Green
    Write-Host "Invitation ID: $($invitation.Id)" -ForegroundColor Cyan
    Write-Host "Invited User ID: $($invitation.InvitedUser.Id)" -ForegroundColor Cyan
    Write-Host "Redemption URL: $($invitation.InviteRedeemUrl)" -ForegroundColor Yellow
    
    Write-Host "Check your email ($GuestEmail) for the invitation!" -ForegroundColor Magenta
    Write-Host "After accepting, you can sign in to the PFMP app with this account." -ForegroundColor White

    # Save the guest user info
    $guestInfo = @{
        Email = $GuestEmail
        DisplayName = $DisplayName
        InvitationId = $invitation.Id
        UserId = $invitation.InvitedUser.Id
        RedemptionUrl = $invitation.InviteRedeemUrl
        InvitedAt = Get-Date
    }
    
    $guestInfo | ConvertTo-Json | Out-File "guest-user-info.json" -Encoding UTF8
    Write-Host "Guest user info saved to guest-user-info.json" -ForegroundColor Cyan

} catch {
    Write-Host "Error inviting guest user: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}