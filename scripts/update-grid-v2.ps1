# PowerShell script to update Grid v1 to Grid v2 throughout the application
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$sourceDir = Join-Path $repoRoot 'pfmp-frontend\src'

# Get all TypeScript React files that need Grid v2 conversion
$files = Get-ChildItem -Path $sourceDir -Recurse -Include "*.tsx" 

Write-Host "Scanning files for Grid v1/v2 updates..."

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    $updated = $false
    
    # Fix Grid2 with direct xs/sm/md props to use size prop
    if ($content -match "Grid2\s+xs=") {
        Write-Host "Fixing Grid2 syntax in: $($file.Name)"
        
        # Fix Grid2 xs={6} md={3} format
        $content = $content -replace "Grid2\s+xs=\{(\d+)\}\s+md=\{(\d+)\}", "Grid2 size={{ xs: `$1, md: `$2 }}"
        $content = $content -replace "Grid2\s+xs=\{(\d+)\}\s+sm=\{(\d+)\}\s+md=\{(\d+)\}\s+lg=\{(\d+)\}", "Grid2 size={{ xs: `$1, sm: `$2, md: `$3, lg: `$4 }}"
        $content = $content -replace "Grid2\s+xs=\{(\d+)\}\s+sm=\{(\d+)\}\s+md=\{(\d+)\}", "Grid2 size={{ xs: `$1, sm: `$2, md: `$3 }}"
        $content = $content -replace "Grid2\s+xs=\{(\d+)\}\s+sm=\{(\d+)\}", "Grid2 size={{ xs: `$1, sm: `$2 }}"
        $content = $content -replace "Grid2\s+xs=\{(\d+)\}", "Grid2 size={{ xs: `$1 }}"
        
        $updated = $true
    }
    
    # Convert remaining Grid v1 to Grid2
    if ($content -match "<Grid\s+(item|container)" -or $content -match "Grid.*from.*@mui/material") {
        Write-Host "Converting Grid v1 to v2 in: $($file.Name)"
        
        # Remove Grid from imports if present, add Grid2 import
        if ($content -match "Grid.*from.*@mui/material") {
            $content = $content -replace "(\s+)Grid,", "$1"
            if ($content -notmatch "Grid2.*from.*@mui/material") {
                $content = $content -replace "(} from '@mui/material';)", "} from '@mui/material';`nimport Grid2 from '@mui/material/Unstable_Grid2';"
            }
        }
        
        # Convert Grid container and items
        $content = $content -replace "<Grid\s+container", "<Grid2 container"
        $content = $content -replace "</Grid>", "</Grid2>"
        
        # Convert Grid item with props
        $content = $content -replace "<Grid\s+item\s+xs=\{(\d+)\}\s+sm=\{(\d+)\}\s+md=\{(\d+)\}\s+lg=\{(\d+)\}", "<Grid2 size={{ xs: `$1, sm: `$2, md: `$3, lg: `$4 }}"
        $content = $content -replace "<Grid\s+item\s+xs=\{(\d+)\}\s+sm=\{(\d+)\}\s+md=\{(\d+)\}", "<Grid2 size={{ xs: `$1, sm: `$2, md: `$3 }}"
        $content = $content -replace "<Grid\s+item\s+xs=\{(\d+)\}\s+md=\{(\d+)\}\s+lg=\{(\d+)\}", "<Grid2 size={{ xs: `$1, md: `$2, lg: `$3 }}"
        $content = $content -replace "<Grid\s+item\s+xs=\{(\d+)\}\s+md=\{(\d+)\}", "<Grid2 size={{ xs: `$1, md: `$2 }}"
        $content = $content -replace "<Grid\s+item\s+xs=\{(\d+)\}\s+sm=\{(\d+)\}", "<Grid2 size={{ xs: `$1, sm: `$2 }}"
        $content = $content -replace "<Grid\s+item\s+xs=\{(\d+)\}", "<Grid2 size={{ xs: `$1 }}"
        
        # Handle cases without curly braces
        $content = $content -replace "<Grid\s+item\s+xs=(\d+)\s+sm=(\d+)\s+md=(\d+)\s+lg=(\d+)", "<Grid2 size={{ xs: `$1, sm: `$2, md: `$3, lg: `$4 }}"
        $content = $content -replace "<Grid\s+item\s+xs=(\d+)\s+sm=(\d+)\s+md=(\d+)", "<Grid2 size={{ xs: `$1, sm: `$2, md: `$3 }}"
        $content = $content -replace "<Grid\s+item\s+xs=(\d+)\s+md=(\d+)\s+lg=(\d+)", "<Grid2 size={{ xs: `$1, md: `$2, lg: `$3 }}"
        $content = $content -replace "<Grid\s+item\s+xs=(\d+)\s+md=(\d+)", "<Grid2 size={{ xs: `$1, md: `$2 }}"
        $content = $content -replace "<Grid\s+item\s+xs=(\d+)\s+sm=(\d+)", "<Grid2 size={{ xs: `$1, sm: `$2 }}"
        $content = $content -replace "<Grid\s+item\s+xs=(\d+)", "<Grid2 size={{ xs: `$1 }}"
        
        # Handle Grid item without size props
        $content = $content -replace "<Grid\s+item>", "<Grid2>"
        $content = $content -replace "<Grid\s+item\s+([^>]*>)", "<Grid2 `$1"
        
        $updated = $true
    }
    
    # Only write if content changed
    if ($updated -and ($content -ne $originalContent)) {
        Set-Content $file.FullName -Value $content -NoNewline
        Write-Host "Updated: $($file.Name)"
    }
}

Write-Host "Grid v1 to v2 migration completed!"
