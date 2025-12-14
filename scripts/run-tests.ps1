<#
PFMP Test Runner
Runs dotnet test in an external PowerShell window and logs output to a file.

Usage:
    .\run-tests.ps1              # normal output
    .\run-tests.ps1 -Verbose     # verbose output

Output is written to: C:\pfmp\PFMP-API.Tests.Output.txt
#>
param(
    [switch]$Verbose
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoLeaf = Split-Path -Leaf $scriptDir
if ($repoLeaf -ieq 'scripts') { $repoRoot = Split-Path -Parent $scriptDir } else { $repoRoot = $scriptDir }

$testProjectPath = Join-Path $repoRoot 'PFMP-API.Tests'
$outputFile = Join-Path $repoRoot 'PFMP-API.Tests.Output.txt'

if (-not (Test-Path $testProjectPath)) {
    Write-Host "ERROR: Test project path not found: $testProjectPath" -ForegroundColor Red
    exit 1
}

function Test-Command($name) { $null -ne (Get-Command $name -ErrorAction SilentlyContinue) }
if (-not (Test-Command dotnet)) {
    Write-Host "ERROR: 'dotnet' not on PATH" -ForegroundColor Red
    exit 2
}

$verbosityArg = if ($Verbose) { '--verbosity normal' } else { '--verbosity quiet' }

Write-Host "Starting PFMP-API.Tests in external window..." -ForegroundColor Green
Write-Host " Test Project: $testProjectPath" -ForegroundColor Yellow
Write-Host " Output File:  $outputFile" -ForegroundColor Yellow

# Build the command to run in the external window
$testCommand = @"
[Console]::Title = 'PFMP-API.Tests';
Set-Location '$testProjectPath';
Write-Host '========================================' -ForegroundColor Cyan;
Write-Host 'PFMP-API.Tests Runner' -ForegroundColor Cyan;
Write-Host '========================================' -ForegroundColor Cyan;
Write-Host '';
Write-Host 'Starting test run at:' (Get-Date) -ForegroundColor Yellow;
Write-Host 'Output file: $outputFile' -ForegroundColor Yellow;
Write-Host '';

# Clear previous output and set encoding
`$null = New-Item -Path '$outputFile' -ItemType File -Force;

# Run tests and tee to both console and file
try {
    Write-Host 'Building and running tests...' -ForegroundColor Green;
    Write-Host '';
    
    # Run dotnet test with output to file (UTF8 encoding)
    `$output = dotnet test $verbosityArg 2>&1;
    `$output | ForEach-Object { `$_ } | Tee-Object -FilePath '$outputFile' -Append;
    # Re-save as UTF8 to fix encoding
    `$content = Get-Content '$outputFile' -Raw;
    [System.IO.File]::WriteAllText('$outputFile', `$content, [System.Text.UTF8Encoding]::new(`$false));
    
    Write-Host '';
    Write-Host '========================================' -ForegroundColor Cyan;
    Write-Host 'Test run complete at:' (Get-Date) -ForegroundColor Green;
    Write-Host 'Results saved to: $outputFile' -ForegroundColor Yellow;
    Write-Host '========================================' -ForegroundColor Cyan;
} catch {
    Write-Host 'ERROR: Test execution failed' -ForegroundColor Red;
    `$_.Exception.Message | Tee-Object -FilePath '$outputFile' -Append;
}

Write-Host '';
Write-Host 'Press Enter to close this window...' -ForegroundColor Gray;
Read-Host;
"@

# Start the test runner in a new PowerShell window
Start-Process powershell -WorkingDirectory $testProjectPath -ArgumentList '-NoExit', '-Command', $testCommand

Write-Host ""
Write-Host "Test runner started in external window." -ForegroundColor Green
Write-Host "Results will be written to: $outputFile" -ForegroundColor Yellow

exit 0
