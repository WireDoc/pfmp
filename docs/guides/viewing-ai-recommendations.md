# Viewing AI Recommendations

This guide shows you how to view AI recommendations that have been generated and saved to the database.

---

## Super Quick Start ⚡

**The easiest way** - Load helper functions:

```powershell
cd c:\pfmp
. .\scripts\AdviceHelpers.ps1   # Loads all helper functions

# Then use simple commands:
Show-BothAdvice                  # View latest Gemini + Claude
Show-AdviceSummary               # Table of all advice
Show-CostStats                   # Cost and agreement statistics
Copy-BothAdvice                  # Copy to clipboard
Export-LatestAdvice              # Save to file
```

---

## Quick Commands

### View Latest Recommendation

```powershell
# Get the most recent advice
$advice = Invoke-RestMethod -Uri "http://localhost:5052/api/advice/user/2"
$latest = $advice[0]

# View Gemini's primary recommendation
Write-Host $latest.primaryRecommendation

# View Claude's backup validation
Write-Host $latest.backupCorroboration
```

### View Both Primary and Backup Together

```powershell
$advice = Invoke-RestMethod -Uri "http://localhost:5052/api/advice/user/2"
$latest = $advice[0]

Write-Host "`n=== GEMINI 2.5 PRO (PRIMARY) ===" -ForegroundColor Cyan
Write-Host $latest.primaryRecommendation

Write-Host "`n`n=== CLAUDE OPUS 4 (BACKUP VALIDATION) ===" -ForegroundColor Yellow
Write-Host $latest.backupCorroboration

Write-Host "`n`n=== METADATA ===" -ForegroundColor Green
Write-Host "Agreement: $($latest.backupAgreementLevel) ($($latest.agreementScore * 100)%)"
Write-Host "Cost: `$$($latest.aiGenerationCost)"
Write-Host "Tokens: $($latest.totalTokensUsed)"
```

---

## Method 1: API Endpoint (Easiest)

Get all advice for a user:

```powershell
# Get all advice for user 2
$advice = Invoke-RestMethod -Uri "http://localhost:5052/api/advice/user/2"

# View the latest recommendation
$latest = $advice[0]
Write-Host $latest.primaryRecommendation
```

---

## Method 2: View Just Gemini's Output

```powershell
# Quick one-liner for Gemini's recommendation
(Invoke-RestMethod -Uri "http://localhost:5052/api/advice/user/2")[0].primaryRecommendation
```

---

## Method 3: View Just Claude's Validation

```powershell
# Quick one-liner for Claude's backup validation
(Invoke-RestMethod -Uri "http://localhost:5052/api/advice/user/2")[0].backupCorroboration
```

---

## Method 4: View Specific Advice by ID

```powershell
# Get all advice
$advice = Invoke-RestMethod -Uri "http://localhost:5052/api/advice/user/2"

# Find specific advice by ID
$specific = $advice | Where-Object { $_.adviceId -eq 11 }

# View it
Write-Host $specific.primaryRecommendation
```

---

## Method 5: Export to File for Review

Save the latest advice to a text file:

```powershell
# Get latest advice
$advice = Invoke-RestMethod -Uri "http://localhost:5052/api/advice/user/2"
$latest = $advice[0]

# Create formatted output
@"
=== GEMINI PRIMARY RECOMMENDATION ===
$($latest.primaryRecommendation)

=== CLAUDE BACKUP VALIDATION ===
$($latest.backupCorroboration)

=== METADATA ===
Agreement: $($latest.backupAgreementLevel) ($($latest.agreementScore * 100)%)
Cost: `$$($latest.aiGenerationCost)
Tokens: $($latest.totalTokensUsed)
Created: $($latest.createdAt)
Theme: $($latest.theme)
Status: $($latest.status)
"@ | Out-File "c:\pfmp\latest-ai-advice.txt"

# Open in Notepad
notepad "c:\pfmp\latest-ai-advice.txt"
```

---

## Method 6: Compare Multiple Recommendations

View a summary table of all recommendations:

```powershell
$advice = Invoke-RestMethod -Uri "http://localhost:5052/api/advice/user/2"

$advice | Select-Object `
    adviceId, `
    theme, `
    @{N='Agreement';E={$_.backupAgreementLevel}}, `
    @{N='Score';E={($_.agreementScore * 100).ToString('0.0') + '%'}}, `
    @{N='Cost';E={'$' + $_.aiGenerationCost.ToString('0.0000')}}, `
    @{N='Tokens';E={$_.totalTokensUsed}}, `
    @{N='Created';E={([DateTime]$_.createdAt).ToString('MM/dd HH:mm')}} |
    Format-Table -AutoSize
```

Example output:
```
adviceId theme            Agreement Score Cost    Tokens Created   
-------- -----            --------- ----- ----    ------ -------    
      11 CashOptimization Agree     80.0% $0.0108   2508 10/30 20:17
      10 CashOptimization Agree     80.0% $0.0266   2172 10/30 18:16
       9 TSP                        34.0% $0.0056    946 10/28 13:23
```

---

## Method 7: Copy to Clipboard

```powershell
# Copy Gemini's recommendation to clipboard
(Invoke-RestMethod -Uri "http://localhost:5052/api/advice/user/2")[0].primaryRecommendation | Set-Clipboard

# Copy Claude's validation to clipboard
(Invoke-RestMethod -Uri "http://localhost:5052/api/advice/user/2")[0].backupCorroboration | Set-Clipboard

# Copy both to clipboard
$a = (Invoke-RestMethod -Uri "http://localhost:5052/api/advice/user/2")[0]
@"
=== GEMINI ===
$($a.primaryRecommendation)

=== CLAUDE ===
$($a.backupCorroboration)
"@ | Set-Clipboard
```

---

## Method 8: Filter by Theme

View only specific types of advice:

```powershell
# Get all advice
$advice = Invoke-RestMethod -Uri "http://localhost:5052/api/advice/user/2"

# Filter by theme
$cashAdvice = $advice | Where-Object { $_.theme -eq "CashOptimization" }
$tspAdvice = $advice | Where-Object { $_.theme -eq "TSP" }
$rebalanceAdvice = $advice | Where-Object { $_.theme -eq "Rebalancing" }

# View the latest cash optimization advice
Write-Host $cashAdvice[0].primaryRecommendation
```

---

## Method 9: Filter by Agreement Level

```powershell
# Get all advice
$advice = Invoke-RestMethod -Uri "http://localhost:5052/api/advice/user/2"

# Show only where backup agreed
$agreed = $advice | Where-Object { $_.backupAgreementLevel -eq "Agree" }

# Show only where backup disagreed
$disagreed = $advice | Where-Object { $_.backupAgreementLevel -eq "Disagree" }

# Display
$agreed | Select-Object adviceId, theme, agreementScore, aiGenerationCost | Format-Table
```

---

## Method 10: View Consensus Text

The system also generates a merged "consensus" recommendation:

```powershell
$advice = Invoke-RestMethod -Uri "http://localhost:5052/api/advice/user/2"
$latest = $advice[0]

Write-Host "=== CONSENSUS RECOMMENDATION ===" -ForegroundColor Magenta
Write-Host $latest.consensusText
```

---

## Using the Helper Script

We've created a PowerShell script to make this even easier:

```powershell
# Run the script
.\scripts\View-AIAdvice.ps1

# Or with parameters
.\scripts\View-AIAdvice.ps1 -UserId 2
.\scripts\View-AIAdvice.ps1 -UserId 2 -AdviceId 11
.\scripts\View-AIAdvice.ps1 -UserId 2 -Theme "CashOptimization"
.\scripts\View-AIAdvice.ps1 -UserId 2 -Export
```

See the script documentation below for all options.

---

## API Endpoints Reference

### Get Advice for User
```
GET /api/advice/user/{userId}
```

Query parameters:
- `status` - Filter by status (e.g., "Proposed", "Accepted", "Dismissed")
- `includeDismissed` - Include dismissed advice (default: false)

Example:
```powershell
# Get only proposed advice
Invoke-RestMethod -Uri "http://localhost:5052/api/advice/user/2?status=Proposed"

# Include dismissed advice
Invoke-RestMethod -Uri "http://localhost:5052/api/advice/user/2?includeDismissed=true"
```

### Generate New Advice
```
POST /api/advice/generate/{userId}
```

Example:
```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:5052/api/advice/generate/2"
```

### Analyze (Without Saving)
```
POST /api/ai/analyze/{userId}/{analysisType}
```

Analysis types:
- `cash-optimization`
- `portfolio-rebalancing`
- `tsp-optimization`
- `risk-alignment`

Example:
```powershell
$result = Invoke-RestMethod -Method Post -Uri "http://localhost:5052/api/ai/analyze/2/cash-optimization"
Write-Host $result.primaryRecommendation.recommendationText
```

---

## Data Structure Reference

Each advice record contains:

```json
{
  "adviceId": 11,
  "userId": 2,
  "theme": "CashOptimization",
  "status": "Proposed",
  
  // Primary-Backup AI fields (Wave 7.3)
  "primaryRecommendation": "Full text from Gemini...",
  "backupCorroboration": "Full text from Claude...",
  "backupAgreementLevel": "Agree",
  "agreementScore": 0.8,
  "hasConsensus": true,
  
  // Merged output
  "consensusText": "Combined recommendation...",
  
  // Metadata
  "aiGenerationCost": 0.010821,
  "totalTokensUsed": 2508,
  "modelsUsed": "[\"gemini-2.5-pro\",\"claude-opus-4-20250514\"]",
  "generationMethod": "AI",
  "confidenceScore": 85,
  
  // Timestamps
  "createdAt": "2025-10-30T20:17:09.763Z",
  "updatedAt": "2025-10-30T20:17:09.763Z",
  "acceptedAt": null,
  "dismissedAt": null
}
```

---

## Tips and Best Practices

### 1. Comparing AI Models

When testing different AI configurations, use this to compare outputs:

```powershell
# Get two advice records
$advice = Invoke-RestMethod -Uri "http://localhost:5052/api/advice/user/2"
$new = $advice[0]
$old = $advice[1]

Write-Host "=== NEW (Gemini) ===" -ForegroundColor Cyan
Write-Host $new.primaryRecommendation
Write-Host "`nCost: $($new.aiGenerationCost) | Tokens: $($new.totalTokensUsed)"

Write-Host "`n=== OLD (GPT-4o) ===" -ForegroundColor Yellow
Write-Host $old.primaryRecommendation
Write-Host "`nCost: $($old.aiGenerationCost) | Tokens: $($old.totalTokensUsed)"
```

### 2. Cost Analysis

Track AI costs over time:

```powershell
$advice = Invoke-RestMethod -Uri "http://localhost:5052/api/advice/user/2"

# Calculate total costs
$totalCost = ($advice | Measure-Object -Property aiGenerationCost -Sum).Sum
$avgCost = ($advice | Measure-Object -Property aiGenerationCost -Average).Average

Write-Host "Total AI Cost: `$$($totalCost.ToString('0.00'))"
Write-Host "Average Cost per Request: `$$($avgCost.ToString('0.0000'))"
Write-Host "Total Advice Generated: $($advice.Count)"
```

### 3. Quality Monitoring

Track agreement scores:

```powershell
$advice = Invoke-RestMethod -Uri "http://localhost:5052/api/advice/user/2"

# Filter to recent advice with new primary-backup system
$recent = $advice | Where-Object { $_.backupAgreementLevel -ne $null }

# Calculate average agreement
$avgAgreement = ($recent | Measure-Object -Property agreementScore -Average).Average

Write-Host "Average Agreement Score: $($avgAgreement * 100)%"
Write-Host "Total Analyzed: $($recent.Count)"
Write-Host "Agreements: $(($recent | Where-Object {$_.backupAgreementLevel -eq 'Agree'}).Count)"
Write-Host "Disagreements: $(($recent | Where-Object {$_.backupAgreementLevel -eq 'Disagree'}).Count)"
```

### 4. Save for Review Session

Create a review document with multiple advice items:

```powershell
$advice = Invoke-RestMethod -Uri "http://localhost:5052/api/advice/user/2"

$output = @"
# AI Advice Review Session - $(Get-Date -Format 'yyyy-MM-dd HH:mm')

Total Advice Items: $($advice.Count)

"@

foreach ($item in $advice | Select-Object -First 5) {
    $output += @"

---
## Advice #$($item.adviceId) - $($item.theme)
**Created:** $($item.createdAt)
**Agreement:** $($item.backupAgreementLevel) ($($item.agreementScore * 100)%)
**Cost:** `$$($item.aiGenerationCost)

### Primary (Gemini):
$($item.primaryRecommendation)

### Backup (Claude):
$($item.backupCorroboration)


"@
}

$output | Out-File "c:\pfmp\ai-review-$(Get-Date -Format 'yyyyMMdd-HHmm').txt"
```

---

## Troubleshooting

### No Advice Found
```powershell
# Check if backend is running
Invoke-RestMethod -Uri "http://localhost:5052/health"

# Generate new advice if needed
Invoke-RestMethod -Method Post -Uri "http://localhost:5052/api/advice/generate/2"
```

### Empty Fields
If `primaryRecommendation` or `backupCorroboration` are null, the advice was generated with the old system (Wave 7). Generate new advice to see the primary-backup structure.

### Timeout Errors
```powershell
# Increase timeout for long-running AI requests
Invoke-RestMethod -Method Post -Uri "http://localhost:5052/api/advice/generate/2" -TimeoutSec 120
```

---

**Related Guides:**
- [AI Model Switching](../dev/ai-model-switching.md) - How to change AI providers
- [AI Model Recommendation](../dev/ai-model-recommendation.md) - Why we chose Gemini + Claude

**Script Location:** `scripts/View-AIAdvice.ps1`

**Last Updated:** October 30, 2025
