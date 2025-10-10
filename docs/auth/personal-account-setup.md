# Adding Your Personal Microsoft Account

You have two options to use your regular Microsoft account with the PFMP app:

## Option 1: Guest User Invitation (Recommended for Development)

This keeps your developer tenant separate but allows your personal account access:

```powershell
cd P:\PFMP-API
.\Invite-GuestUser.ps1 -GuestEmail "your-personal-email@outlook.com" -DisplayName "Your Name"
```

**Pros:**
- Keeps tenant secure and controlled
- You maintain full control over who can access
- Good for development and testing
- Clear separation between dev and personal accounts

**Steps:**
1. Run the script with your personal email
2. Check your email for the invitation
3. Accept the invitation
4. Sign in to the PFMP app with your personal account

## Option 2: Multi-Tenant Configuration (Available but not recommended for personal use)

The `Configure-MultiTenant.ps1` script is available but not recommended for personal applications as it allows ANY Microsoft account to sign in. For this personal financial app, we're using the controlled Guest User approach instead.

## Current Setup

**Using Guest User Invitation** - This is the approach we've implemented:
- Full control over access (single user: wiredoc@outlook.com)
- Your personal account works seamlessly  
- Better security for your developer tenant
- Easy to manage who has access
- Perfect for personal applications

## Next Steps

Your invitation has been sent to wiredoc@outlook.com! Here's what to do:

1. **Check your email** - Look for an invitation from Microsoft Azure
2. **Accept the invitation** - Click the link in the email to accept
3. **Start the PFMP API** - Run `dotnet run` in P:\PFMP-API
4. **Test authentication** - Navigate to the API endpoints and sign in
5. **Automatic user creation** - The app will create a user record for you automatically

Your personal Microsoft account (wiredoc@outlook.com) will now work with the PFMP authentication system!
