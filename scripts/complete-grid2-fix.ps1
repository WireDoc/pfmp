# Complete Grid2 import fix for MUI v7
$sourceDir = "W:\pfmp\pfmp-frontend\src"

Get-ChildItem -Path $sourceDir -Recurse -Include "*.tsx" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $originalContent = $content
    
    # Remove incorrect Grid2 imports
    $content = $content -replace "import Grid2 from '@mui/material/Grid2';\s*", ""
    
    # Check if file uses Grid2 components and add to MUI import if needed
    if ($content -match "Grid2" -and $content -notmatch "Grid2," -and $content -match "} from '@mui/material';") {
        # Add Grid2 to existing MUI import
        $content = $content -replace "([\w\s,]+)(} from '@mui/material';)", "`$1,`n  Grid2`$2"
    }
    
    # Fix Grid item to Grid2 with size prop
    $content = $content -replace "<Grid item", "<Grid2"
    $content = $content -replace "Grid item", "Grid2"
    
    # Fix Grid xs/sm/md/lg props to size prop format
    $content = $content -replace "Grid2 xs=\{?(\d+)\}? sm=\{?(\d+)\}? md=\{?(\d+)\}?", "Grid2 size={{ xs: `$1, sm: `$2, md: `$3 }}"
    $content = $content -replace "Grid2 xs=\{?(\d+)\}? sm=\{?(\d+)\}?", "Grid2 size={{ xs: `$1, sm: `$2 }}"
    $content = $content -replace "Grid2 xs=\{?(\d+)\}?", "Grid2 size={{ xs: `$1 }}"
    
    if ($content -ne $originalContent) {
        Write-Host "Complete Grid2 fix applied to: $($_.Name)"
        Set-Content $_.FullName -Value $content -NoNewline
    }
}

Write-Host "Complete Grid2 fixes applied!"