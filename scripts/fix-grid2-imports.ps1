# Fix Grid2 import paths for MUI v7
$sourceDir = "W:\pfmp\pfmp-frontend\src"

Get-ChildItem -Path $sourceDir -Recurse -Include "*.tsx" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $originalContent = $content
    
    # Replace incorrect Grid2 import path with correct one for MUI v7
    $content = $content -replace "import Grid2 from '@mui/material/Grid2';", ""
    
    # Add correct Grid2 import after @mui/material import
    if ($content -match "} from '@mui/material';" -and $content -match "Grid2") {
        $content = $content -replace "(} from '@mui/material';)", "`$1`nimport { Grid2 } from '@mui/material';"
    }
    
    if ($content -ne $originalContent) {
        Write-Host "Fixing Grid2 import in: $($_.Name)"
        Set-Content $_.FullName -Value $content -NoNewline
    }
}

Write-Host "Grid2 import fixes complete!"