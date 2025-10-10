# Fix all Grid components to use MUI v7 Grid with new syntax
$sourceDir = "P:\pfmp-frontend\src"

Get-ChildItem -Path $sourceDir -Recurse -Include "*.tsx" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $originalContent = $content
    
    # Remove any Grid2 imports and duplicate/malformed imports
    $content = $content -replace "import Grid2 from '@mui/material/Grid2';\s*", ""
    $content = $content -replace "import \{ Grid2.*?\} from '@mui/material';\s*", ""
    $content = $content -replace ",\s*Grid2", ""
    $content = $content -replace "Grid2,?\s*", ""
    $content = $content -replace ",\s*,", ","
    $content = $content -replace "{\s*,", "{"
    $content = $content -replace ",\s*}", "}"
    
    # Add Grid to MUI import if Grid2 components are used
    if ($content -match "Grid2" -and $content -match "} from '@mui/material';" -and $content -notmatch "Grid,") {
        $content = $content -replace "([\w\s,]+)(} from '@mui/material';)", "`$1,`n  Grid`$2"
    }
    
    # Replace Grid2 with Grid
    $content = $content -replace "Grid2", "Grid"
    
    # Fix Grid item props to size props (convert old v1 syntax to v2)
    $content = $content -replace "<Grid\s+item\s+xs=\{?(\d+)\}?\s+sm=\{?(\d+)\}?\s+md=\{?(\d+)\}?", "<Grid size={{ xs: `$1, sm: `$2, md: `$3 }}"
    $content = $content -replace "<Grid\s+item\s+xs=\{?(\d+)\}?\s+md=\{?(\d+)\}?", "<Grid size={{ xs: `$1, md: `$2 }}"
    $content = $content -replace "<Grid\s+item\s+xs=\{?(\d+)\}?\s+sm=\{?(\d+)\}?", "<Grid size={{ xs: `$1, sm: `$2 }}"
    $content = $content -replace "<Grid\s+item\s+xs=\{?(\d+)\}?", "<Grid size={{ xs: `$1 }}"
    $content = $content -replace "<Grid\s+item", "<Grid"
    
    # Fix size props that might still use old syntax
    $content = $content -replace "Grid\s+xs=\{?(\d+)\}?\s+sm=\{?(\d+)\}?\s+md=\{?(\d+)\}?", "Grid size={{ xs: `$1, sm: `$2, md: `$3 }}"
    $content = $content -replace "Grid\s+xs=\{?(\d+)\}?\s+md=\{?(\d+)\}?", "Grid size={{ xs: `$1, md: `$2 }}"
    $content = $content -replace "Grid\s+xs=\{?(\d+)\}?\s+sm=\{?(\d+)\}?", "Grid size={{ xs: `$1, sm: `$2 }}"
    $content = $content -replace "Grid\s+xs=\{?(\d+)\}?", "Grid size={{ xs: `$1 }}"
    
    if ($content -ne $originalContent) {
        Write-Host "Applied MUI v7 Grid fixes to: $($_.Name)"
        Set-Content $_.FullName -Value $content -NoNewline
    }
}

Write-Host "MUI v7 Grid migration complete!"
