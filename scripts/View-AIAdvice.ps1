<#
.SYNOPSIS
    View AI-generated financial advice recommendations.

.DESCRIPTION
    This script provides easy access to AI recommendations stored in the PFMP database.
    It can display primary (Gemini) and backup (Claude) recommendations, show summaries,
    export to files, and compare multiple recommendations.

.PARAMETER UserId
    The user ID to fetch advice for (default: 2)

.PARAMETER AdviceId
    View a specific advice record by ID

.PARAMETER Theme
    Filter by theme (CashOptimization, TSP, Rebalancing, Risk)

.PARAMETER Latest
    Show only the most recent recommendation (default: true)

.PARAMETER ShowBackup
    Include the backup AI validation in output (default: true)

.PARAMETER ShowMetadata
    Include metadata (cost, tokens, agreement) in output (default: true)

.PARAMETER Export
    Export to a text file in the current directory

.PARAMETER Summary
    Show a summary table of all advice instead of full text

.PARAMETER AgreementLevel
    Filter by agreement level (Agree, Disagree, PartialAgree)

.EXAMPLE
    .\View-AIAdvice.ps1
    Shows the latest advice for user 2 with full details

.EXAMPLE
    .\View-AIAdvice.ps1 -UserId 2 -AdviceId 11
    Shows specific advice record #11

.EXAMPLE
    .\View-AIAdvice.ps1 -Theme "CashOptimization"
    Shows latest cash optimization advice

.EXAMPLE
    .\View-AIAdvice.ps1 -Summary
    Shows a table summary of all advice

.EXAMPLE
    .\View-AIAdvice.ps1 -Export
    Exports the latest advice to a text file

.EXAMPLE
    .\View-AIAdvice.ps1 -AgreementLevel "Disagree"
    Shows advice where backup AI disagreed with primary

.NOTES
    Author: PFMP Team
    Version: 1.0
    Requires: Backend server running on http://localhost:5052
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory=$false)]
    [int]$UserId = 2,

    [Parameter(Mandatory=$false)]
    [int]$AdviceId,

    [Parameter(Mandatory=$false)]
    [ValidateSet("CashOptimization", "TSP", "Rebalancing", "Risk", "AlertResponse")]
    [string]$Theme,

    [Parameter(Mandatory=$false)]
    [bool]$Latest = $true,

    [Parameter(Mandatory=$false)]
    [bool]$ShowBackup = $true,

    [Parameter(Mandatory=$false)]
    [bool]$ShowMetadata = $true,

    [Parameter(Mandatory=$false)]
    [switch]$Export,

    [Parameter(Mandatory=$false)]
    [switch]$Summary,

    [Parameter(Mandatory=$false)]
    [ValidateSet("Agree", "Disagree", "PartialAgree")]
    [string]$AgreementLevel
)

# Configuration
$baseUrl = "http://localhost:5052"
$apiEndpoint = "$baseUrl/api/advice/user/$UserId"

# Color scheme
$primaryColor = "Cyan"
$backupColor = "Yellow"
$metadataColor = "Green"
$errorColor = "Red"
$warningColor = "Magenta"

# Function to format currency
function Format-Currency {
    param([decimal]$amount)
    return "`$$($amount.ToString('0.0000'))"
}

# Function to format percentage
function Format-Percentage {
    param([decimal]$value)
    if ($value -eq 0) { return "N/A" }
    return "$($value * 100)%"
}

# Function to display a single advice item
function Show-AdviceItem {
    param($advice)

    Write-Host "`n========================================" -ForegroundColor White
    Write-Host "Advice #$($advice.adviceId) - $($advice.theme)" -ForegroundColor White
    Write-Host "========================================" -ForegroundColor White

    if ($ShowMetadata) {
        Write-Host "`nStatus: $($advice.status)" -ForegroundColor $metadataColor
        Write-Host "Created: $($advice.createdAt)" -ForegroundColor $metadataColor
        
        if ($advice.backupAgreementLevel) {
            $agreementColor = if ($advice.backupAgreementLevel -eq "Agree") { "Green" } else { "Red" }
            Write-Host "Agreement: $($advice.backupAgreementLevel) ($(Format-Percentage $advice.agreementScore))" -ForegroundColor $agreementColor
        }
        
        Write-Host "Cost: $(Format-Currency $advice.aiGenerationCost)" -ForegroundColor $metadataColor
        Write-Host "Tokens: $($advice.totalTokensUsed)" -ForegroundColor $metadataColor
        
        if ($advice.modelsUsed) {
            Write-Host "Models: $($advice.modelsUsed)" -ForegroundColor $metadataColor
        }
    }

    # Primary recommendation
    Write-Host "`n=== PRIMARY RECOMMENDATION (Gemini) ===" -ForegroundColor $primaryColor
    if ($advice.primaryRecommendation) {
        Write-Host $advice.primaryRecommendation
    } else {
        Write-Host "[No primary recommendation - generated with old system]" -ForegroundColor $warningColor
        if ($advice.conservativeRecommendation) {
            Write-Host "`n(Showing legacy conservative recommendation instead):" -ForegroundColor $warningColor
            Write-Host $advice.conservativeRecommendation
        }
    }

    # Backup validation
    if ($ShowBackup) {
        Write-Host "`n=== BACKUP VALIDATION (Claude) ===" -ForegroundColor $backupColor
        if ($advice.backupCorroboration) {
            Write-Host $advice.backupCorroboration
        } else {
            Write-Host "[No backup corroboration - generated with old system]" -ForegroundColor $warningColor
            if ($advice.aggressiveRecommendation) {
                Write-Host "`n(Showing legacy aggressive recommendation instead):" -ForegroundColor $warningColor
                Write-Host $advice.aggressiveRecommendation
            }
        }
    }

    # Consensus (if available)
    if ($advice.consensusText -and $advice.consensusText -ne "See individual recommendations below") {
        Write-Host "`n=== CONSENSUS RECOMMENDATION ===" -ForegroundColor $warningColor
        Write-Host $advice.consensusText
    }

    Write-Host "`n" # Extra newline for readability
}

# Function to export advice to file
function Export-AdviceToFile {
    param($advice, $filename)

    $content = @"
========================================
PFMP AI ADVICE EXPORT
========================================

Advice ID:    $($advice.adviceId)
Theme:        $($advice.theme)
Status:       $($advice.status)
Created:      $($advice.createdAt)
Agreement:    $($advice.backupAgreementLevel) ($(Format-Percentage $advice.agreementScore))
Cost:         $(Format-Currency $advice.aiGenerationCost)
Tokens:       $($advice.totalTokensUsed)
Models:       $($advice.modelsUsed)

========================================
PRIMARY RECOMMENDATION (Gemini 2.5 Pro)
========================================

$($advice.primaryRecommendation)

========================================
BACKUP VALIDATION (Claude Opus 4)
========================================

$($advice.backupCorroboration)

========================================
CONSENSUS RECOMMENDATION
========================================

$($advice.consensusText)

========================================
Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
========================================
"@

    $content | Out-File $filename -Encoding UTF8
    Write-Host "`nExported to: $filename" -ForegroundColor $metadataColor
}

# Main script logic
try {
    Write-Host "Fetching advice from $apiEndpoint..." -ForegroundColor $metadataColor

    # Fetch advice
    $allAdvice = Invoke-RestMethod -Uri $apiEndpoint -TimeoutSec 30

    if (-not $allAdvice -or $allAdvice.Count -eq 0) {
        Write-Host "No advice found for user $UserId" -ForegroundColor $errorColor
        Write-Host "Generate advice with: Invoke-RestMethod -Method Post -Uri '$baseUrl/api/advice/generate/$UserId'" -ForegroundColor $warningColor
        exit 1
    }

    Write-Host "Found $($allAdvice.Count) advice record(s)" -ForegroundColor $metadataColor

    # Apply filters
    $filteredAdvice = $allAdvice

    if ($AdviceId) {
        $filteredAdvice = $filteredAdvice | Where-Object { $_.adviceId -eq $AdviceId }
    }

    if ($Theme) {
        $filteredAdvice = $filteredAdvice | Where-Object { $_.theme -eq $Theme }
    }

    if ($AgreementLevel) {
        $filteredAdvice = $filteredAdvice | Where-Object { $_.backupAgreementLevel -eq $AgreementLevel }
    }

    if ($Latest -and -not $AdviceId) {
        $filteredAdvice = @($filteredAdvice[0])
    }

    if (-not $filteredAdvice -or $filteredAdvice.Count -eq 0) {
        Write-Host "No advice found matching filters" -ForegroundColor $errorColor
        exit 1
    }

    # Display results
    if ($Summary) {
        # Show summary table
        Write-Host "`nAdvice Summary for User $UserId" -ForegroundColor White
        Write-Host "================================`n" -ForegroundColor White

        $filteredAdvice | Select-Object `
            @{N='ID';E={$_.adviceId}}, `
            @{N='Theme';E={$_.theme}}, `
            @{N='Agreement';E={$_.backupAgreementLevel}}, `
            @{N='Score';E={Format-Percentage $_.agreementScore}}, `
            @{N='Cost';E={Format-Currency $_.aiGenerationCost}}, `
            @{N='Tokens';E={$_.totalTokensUsed}}, `
            @{N='Status';E={$_.status}}, `
            @{N='Created';E={([DateTime]$_.createdAt).ToString('MM/dd HH:mm')}} |
            Format-Table -AutoSize

        # Show statistics
        $withBackup = $filteredAdvice | Where-Object { $_.backupAgreementLevel -ne $null }
        if ($withBackup.Count -gt 0) {
            Write-Host "`nStatistics:" -ForegroundColor $metadataColor
            Write-Host "  Total Cost: $(Format-Currency ($filteredAdvice | Measure-Object -Property aiGenerationCost -Sum).Sum)"
            Write-Host "  Avg Cost: $(Format-Currency ($filteredAdvice | Measure-Object -Property aiGenerationCost -Average).Average)"
            Write-Host "  Avg Agreement: $(Format-Percentage ($withBackup | Measure-Object -Property agreementScore -Average).Average)"
            Write-Host "  Agreements: $(($withBackup | Where-Object {$_.backupAgreementLevel -eq 'Agree'}).Count)"
            Write-Host "  Disagreements: $(($withBackup | Where-Object {$_.backupAgreementLevel -eq 'Disagree'}).Count)"
        }
    } 
    elseif ($Export) {
        # Export to file
        $advice = $filteredAdvice[0]
        $filename = "ai-advice-$($advice.adviceId)-$(Get-Date -Format 'yyyyMMdd-HHmmss').txt"
        Export-AdviceToFile -advice $advice -filename $filename

        # Offer to open
        $open = Read-Host "`nOpen file? (Y/N)"
        if ($open -eq 'Y' -or $open -eq 'y') {
            notepad $filename
        }
    }
    else {
        # Show full details
        foreach ($advice in $filteredAdvice) {
            Show-AdviceItem -advice $advice
        }

        if ($filteredAdvice.Count -gt 1) {
            Write-Host "`nShowing $($filteredAdvice.Count) advice record(s)" -ForegroundColor $metadataColor
            Write-Host "Use -Latest `$false to see all, or -AdviceId to see a specific one" -ForegroundColor $metadataColor
        }
    }

} catch {
    Write-Host "`nError: $($_.Exception.Message)" -ForegroundColor $errorColor
    Write-Host "`nMake sure the backend server is running:" -ForegroundColor $warningColor
    Write-Host "  cd c:\pfmp" -ForegroundColor $warningColor
    Write-Host "  .\start-dev-servers.bat" -ForegroundColor $warningColor
    exit 1
}
