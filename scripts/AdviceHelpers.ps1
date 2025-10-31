# Quick AI Advice Helper Commands
# Source this file for easy access to common advice viewing commands

# Set the API base URL
$Global:PfmpApiBase = "http://localhost:5052"

# Quick function to get latest advice
function Get-LatestAdvice {
    param([int]$UserId = 2)
    $advice = Invoke-RestMethod -Uri "$Global:PfmpApiBase/api/advice/user/$UserId"
    return $advice[0]
}

# Show just Gemini's recommendation
function Show-GeminiAdvice {
    param([int]$UserId = 2)
    $latest = Get-LatestAdvice -UserId $UserId
    Write-Host "`n=== GEMINI 2.5 PRO ===" -ForegroundColor Cyan
    Write-Host $latest.primaryRecommendation
}

# Show just Claude's validation
function Show-ClaudeAdvice {
    param([int]$UserId = 2)
    $latest = Get-LatestAdvice -UserId $UserId
    Write-Host "`n=== CLAUDE OPUS 4 ===" -ForegroundColor Yellow
    Write-Host $latest.backupCorroboration
}

# Show both together
function Show-BothAdvice {
    param([int]$UserId = 2)
    $latest = Get-LatestAdvice -UserId $UserId
    
    Write-Host "`n========================================" -ForegroundColor White
    Write-Host "Advice #$($latest.adviceId) - $($latest.theme)" -ForegroundColor White
    Write-Host "Agreement: $($latest.backupAgreementLevel) ($($latest.agreementScore * 100)%)" -ForegroundColor Green
    Write-Host "Cost: `$$($latest.aiGenerationCost) | Tokens: $($latest.totalTokensUsed)" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor White
    
    Write-Host "`n=== GEMINI 2.5 PRO (PRIMARY) ===" -ForegroundColor Cyan
    Write-Host $latest.primaryRecommendation
    
    Write-Host "`n`n=== CLAUDE OPUS 4 (BACKUP) ===" -ForegroundColor Yellow
    Write-Host $latest.backupCorroboration
}

# Show summary table
function Show-AdviceSummary {
    param([int]$UserId = 2)
    $advice = Invoke-RestMethod -Uri "$Global:PfmpApiBase/api/advice/user/$UserId"
    
    $advice | Select-Object `
        adviceId, `
        theme, `
        @{N='Agreement';E={$_.backupAgreementLevel}}, `
        @{N='Score';E={($_.agreementScore * 100).ToString('0.0') + '%'}}, `
        @{N='Cost';E={'$' + $_.aiGenerationCost.ToString('0.0000')}}, `
        @{N='Tokens';E={$_.totalTokensUsed}}, `
        @{N='Created';E={([DateTime]$_.createdAt).ToString('MM/dd HH:mm')}} |
        Format-Table -AutoSize
}

# Generate new advice
function New-Advice {
    param([int]$UserId = 2)
    Write-Host "Generating new advice for user $UserId..." -ForegroundColor Cyan
    $result = Invoke-RestMethod -Method Post -Uri "$Global:PfmpApiBase/api/advice/generate/$UserId" -TimeoutSec 120
    Write-Host "Generated Advice #$($result.adviceId)" -ForegroundColor Green
    return $result
}

# Copy latest Gemini advice to clipboard
function Copy-GeminiAdvice {
    param([int]$UserId = 2)
    $latest = Get-LatestAdvice -UserId $UserId
    $latest.primaryRecommendation | Set-Clipboard
    Write-Host "Gemini advice copied to clipboard" -ForegroundColor Green
}

# Copy latest Claude validation to clipboard
function Copy-ClaudeAdvice {
    param([int]$UserId = 2)
    $latest = Get-LatestAdvice -UserId $UserId
    $latest.backupCorroboration | Set-Clipboard
    Write-Host "Claude advice copied to clipboard" -ForegroundColor Green
}

# Copy both to clipboard
function Copy-BothAdvice {
    param([int]$UserId = 2)
    $latest = Get-LatestAdvice -UserId $UserId
    @"
=== GEMINI 2.5 PRO ===
$($latest.primaryRecommendation)

=== CLAUDE OPUS 4 ===
$($latest.backupCorroboration)
"@ | Set-Clipboard
    Write-Host "Both recommendations copied to clipboard" -ForegroundColor Green
}

# Export latest to file
function Export-LatestAdvice {
    param(
        [int]$UserId = 2,
        [string]$Path = "latest-advice.txt"
    )
    
    $latest = Get-LatestAdvice -UserId $UserId
    @"
========================================
PFMP AI ADVICE - ID: $($latest.adviceId)
========================================
Theme:      $($latest.theme)
Status:     $($latest.status)
Agreement:  $($latest.backupAgreementLevel) ($($latest.agreementScore * 100)%)
Cost:       `$$($latest.aiGenerationCost)
Tokens:     $($latest.totalTokensUsed)
Created:    $($latest.createdAt)

=== GEMINI 2.5 PRO (PRIMARY) ===
$($latest.primaryRecommendation)

=== CLAUDE OPUS 4 (BACKUP) ===
$($latest.backupCorroboration)

========================================
Exported: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
========================================
"@ | Out-File $Path -Encoding UTF8
    
    Write-Host "Exported to: $Path" -ForegroundColor Green
    return $Path
}

# Show cost statistics
function Show-CostStats {
    param([int]$UserId = 2)
    
    $advice = Invoke-RestMethod -Uri "$Global:PfmpApiBase/api/advice/user/$UserId"
    $totalCost = ($advice | Measure-Object -Property aiGenerationCost -Sum).Sum
    $avgCost = ($advice | Measure-Object -Property aiGenerationCost -Average).Average
    $withBackup = $advice | Where-Object { $_.backupAgreementLevel -ne $null }
    
    Write-Host "`n=== COST STATISTICS ===" -ForegroundColor Cyan
    Write-Host "Total Advice:       $($advice.Count)"
    Write-Host "With Backup AI:     $($withBackup.Count)"
    Write-Host "Total Cost:         `$$($totalCost.ToString('0.00'))"
    Write-Host "Average Cost:       `$$($avgCost.ToString('0.0000'))"
    
    if ($withBackup.Count -gt 0) {
        $avgAgreement = ($withBackup | Measure-Object -Property agreementScore -Average).Average
        Write-Host "`n=== AGREEMENT STATISTICS ===" -ForegroundColor Yellow
        Write-Host "Avg Agreement:      $($avgAgreement * 100)%"
        Write-Host "Agreements:         $(($withBackup | Where-Object {$_.backupAgreementLevel -eq 'Agree'}).Count)"
        Write-Host "Disagreements:      $(($withBackup | Where-Object {$_.backupAgreementLevel -eq 'Disagree'}).Count)"
    }
}

# Display available commands
function Show-AdviceCommands {
    Write-Host "`n=== PFMP AI ADVICE COMMANDS ===" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "View Commands:" -ForegroundColor Yellow
    Write-Host "  Show-GeminiAdvice       - Show latest Gemini recommendation"
    Write-Host "  Show-ClaudeAdvice       - Show latest Claude validation"
    Write-Host "  Show-BothAdvice         - Show both together"
    Write-Host "  Show-AdviceSummary      - Show table of all advice"
    Write-Host ""
    Write-Host "Generate Commands:" -ForegroundColor Yellow
    Write-Host "  New-Advice              - Generate new advice"
    Write-Host ""
    Write-Host "Copy Commands:" -ForegroundColor Yellow
    Write-Host "  Copy-GeminiAdvice       - Copy Gemini to clipboard"
    Write-Host "  Copy-ClaudeAdvice       - Copy Claude to clipboard"
    Write-Host "  Copy-BothAdvice         - Copy both to clipboard"
    Write-Host ""
    Write-Host "Export Commands:" -ForegroundColor Yellow
    Write-Host "  Export-LatestAdvice     - Export latest to text file"
    Write-Host ""
    Write-Host "Stats Commands:" -ForegroundColor Yellow
    Write-Host "  Show-CostStats          - Show cost and agreement statistics"
    Write-Host ""
    Write-Host "Advanced:" -ForegroundColor Yellow
    Write-Host "  Get-LatestAdvice        - Return latest advice object"
    Write-Host "  .\scripts\View-AIAdvice.ps1 - Full featured script"
    Write-Host ""
    Write-Host "All commands accept -UserId parameter (default: 2)" -ForegroundColor Gray
    Write-Host ""
}

# Auto-display commands on load
Show-AdviceCommands

Write-Host "Quick Access Functions Loaded!" -ForegroundColor Green
Write-Host "Type any command above to use it." -ForegroundColor Green
Write-Host ""
