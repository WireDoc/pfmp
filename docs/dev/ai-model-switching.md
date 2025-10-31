# AI Model Switching Guide

## Quick Reference: How to Switch AI Models

The primary-backup AI system is designed for easy experimentation. You can switch models with **zero code changes** using configuration files.

---

## Method 1: Configuration File (RECOMMENDED) ✅

**File:** `appsettings.Development.local.json`

### Current Setup (GPT-4o + Gemini):
```json
"Consensus": {
  "PrimaryService": "OpenAI",
  "BackupService": "Gemini"
}
```

### Switch to Claude + OpenAI:
```json
"Consensus": {
  "PrimaryService": "Claude",
  "BackupService": "OpenAI"
}
```

### Switch to Gemini + Claude:
```json
"Consensus": {
  "PrimaryService": "Gemini",
  "BackupService": "Claude"
}
```

### Swap Primary/Backup (OpenAI ↔ Gemini):
```json
"Consensus": {
  "PrimaryService": "Gemini",
  "BackupService": "OpenAI"
}
```

**Valid Service Names:**
- `"OpenAI"` - GPT-4o (or configured model)
- `"Claude"` - Claude Sonnet 4
- `"Gemini"` - Gemini 2.5 Pro (or configured model)

---

## Method 2: Individual Model Configuration

Each AI service has its own configuration where you can change:
- **Model version** (e.g., `gpt-4o` → `gpt-4o-mini`)
- **Temperature** (creativity level)
- **Max tokens** (response length)
- **Timeout** (request duration)

### OpenAI Configuration:
```json
"OpenAI": {
  "Model": "gpt-4o",           // or "gpt-4o-mini", "gpt-4-turbo"
  "MaxTokens": 4000,
  "Temperature": 1.0,
  "TimeoutSeconds": 300
}
```

### Claude Configuration:
```json
"Claude": {
  "Model": "claude-sonnet-4-20250514",  // or "claude-opus-4-20250514"
  "MaxTokens": 4000,
  "Temperature": 0.3,
  "TimeoutSeconds": 60
}
```

### Gemini Configuration:
```json
"Gemini": {
  "Model": "gemini-2.5-pro",           // or "gemini-2.5-flash"
  "FallbackModel": "gemini-2.5-flash",
  "MaxTokens": 4000,
  "Temperature": 0.5,
  "TimeoutSeconds": 60
}
```

---

## Restart Required?

**Yes**, you need to restart the backend server after changing configuration:

```powershell
cd c:\pfmp
.\stop-dev-servers.bat
.\start-dev-servers.bat
```

The log output will confirm which models are active:
```
Primary-Backup AI initialized: Primary=OpenAI, Backup=Gemini
```

---

## Cost Comparison

| Model | Input ($/1M tokens) | Output ($/1M tokens) | Speed | Quality |
|-------|---------------------|----------------------|-------|---------|
| **GPT-4o** | $2.50 | $10.00 | Fast | Excellent |
| **GPT-4o Mini** | $0.15 | $0.60 | Very Fast | Good |
| **Claude Sonnet 4** | $3.00 | $15.00 | Medium | Excellent |
| **Claude Opus 4** | $15.00 | $75.00 | Slow | Best |
| **Gemini 2.5 Pro** | Free* | Free* | Fast | Excellent |
| **Gemini 2.5 Flash** | Free* | Free* | Very Fast | Good |

*Currently free during beta/testing phase

---

## Common Experiment Scenarios

### 1. Cost Optimization (Cheapest)
```json
"PrimaryService": "Gemini",      // Free
"BackupService": "OpenAI"        // Low cost
```
Then set OpenAI model to `"gpt-4o-mini"`

### 2. Maximum Quality (Most Expensive)
```json
"PrimaryService": "Claude",      // Set model to "claude-opus-4-20250514"
"BackupService": "OpenAI"        // Keep as gpt-4o
```

### 3. Speed Testing
```json
"PrimaryService": "Gemini",      // Set model to "gemini-2.5-flash"
"BackupService": "OpenAI"        // Set model to "gpt-4o-mini"
```

### 4. Current Production (Balanced)
```json
"PrimaryService": "OpenAI",      // gpt-4o ($0.021/request)
"BackupService": "Gemini"        // gemini-2.5-pro (free)
```

---

## Testing After Switch

1. **Restart backend:**
   ```powershell
   .\stop-dev-servers.bat
   .\start-dev-servers.bat
   ```

2. **Check logs for confirmation:**
   Look for: `Primary-Backup AI initialized: Primary=X, Backup=Y`

3. **Test an endpoint:**
   ```powershell
   Invoke-RestMethod -Method Post -Uri "http://localhost:5052/api/advice/generate/2"
   ```

4. **Verify in response:**
   - Check `primaryRecommendation.serviceName`
   - Check `backupCorroboration.serviceName`
   - Check `primaryRecommendation.modelVersion`
   - Check `backupCorroboration.modelVersion`

---

## Troubleshooting

### Error: "Primary service 'X' not found"
- Check spelling: Must be exactly `"OpenAI"`, `"Claude"`, or `"Gemini"` (case-sensitive)
- Verify all three services are registered in `Program.cs`

### One AI responds but not the other
- Check API key in `appsettings.Development.local.json`
- Check timeout settings (some models are slower)
- Check backend logs for specific error messages

### Response is truncated
- Increase `MaxTokens` for that service
- For Gemini: Also check `thinkingBudget` setting (in GeminiService.cs)

### Cost is too high
- Switch to cheaper models (see Cost Comparison table)
- Reduce `MaxTokens` settings
- Use Gemini as primary (currently free)

---

## Best Practices

1. **Start with current setup** (OpenAI + Gemini) - it's well-tested
2. **Test on low-stakes data first** before production use
3. **Monitor costs** in the `Advice.AIGenerationCost` field
4. **Compare quality** by reviewing saved recommendations
5. **Keep both API keys active** for quick switching
6. **Document your changes** when experimenting

---

## Implementation Details

**Code Location:** `PFMP-API/Services/AI/PrimaryBackupAIAdvisor.cs`

The constructor reads config and selects services:
```csharp
var primaryName = options.Value.PrimaryService ?? "OpenAI";
var backupName = options.Value.BackupService ?? "Gemini";

_primaryService = advisorList.FirstOrDefault(a => a.ServiceName == primaryName);
_backupService = advisorList.FirstOrDefault(a => a.ServiceName == backupName);
```

All three services implement `IAIFinancialAdvisor`, so they're **fully interchangeable**.

---

**Last Updated:** October 30, 2024  
**Author:** GitHub Copilot  
**Status:** Production-Ready
