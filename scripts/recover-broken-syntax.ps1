# Recovery script to fix all broken Grid syntax
$sourceDir = "W:\pfmp\pfmp-frontend\src"

Get-ChildItem -Path $sourceDir -Recurse -Include "*.tsx" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $originalContent = $content
    
    # Fix broken JSX - restore Grid components from broken syntax
    $content = $content -replace "<size=", "<Grid size="
    $content = $content -replace "</size>", "</Grid>"
    $content = $content -replace "<lg=", "<Grid lg="
    
    # Replace Grid2 with Grid (correct MUI v7 component)
    $content = $content -replace "Grid2", "Grid"
    
    # Remove any Grid2 imports and add Grid import
    $content = $content -replace "import Grid2 from '@mui/material/Grid2';\s*", ""
    $content = $content -replace "import \{ Grid2.*?\} from '@mui/material';\s*", ""
    $content = $content -replace ",\s*Grid2", ""
    $content = $content -replace "Grid2,?\s*", ""
    
    # Add Grid to MUI import if Grid components are used and Grid is not already imported
    if ($content -match "<Grid" -and $content -match "} from '@mui/material';" -and $content -notmatch "Grid,") {
        $content = $content -replace "([\w\s,]+)(} from '@mui/material';)", "`$1,`n  Grid`$2"
    }
    
    # Clean up malformed imports
    $content = $content -replace ",\s*,", ","
    $content = $content -replace "{\s*,", "{"
    $content = $content -replace ",\s*}", "}"
    $content = $content -replace ",\s*\n\s*}", "}"
    
    # Fix any remaining broken Grid syntax patterns
    $content = $content -replace "<<", "<"
    $content = $content -replace ">>", ">"
    $content = $content -replace "<\s*>", ""
    
    if ($content -ne $originalContent) {
        Write-Host "Recovering broken syntax in: $($_.Name)"
        Set-Content $_.FullName -Value $content -NoNewline
    }
}

Write-Host "Syntax recovery complete!"