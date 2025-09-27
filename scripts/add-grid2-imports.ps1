# Add Grid2 import to files that use Grid2 but don't have the import
$sourceDir = "W:\pfmp\pfmp-frontend\src"

Get-ChildItem -Path $sourceDir -Recurse -Include "*.tsx" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    
    # Check if file uses Grid2 but doesn't import it
    if ($content -match "Grid2\s+" -and $content -notmatch "import.*Grid2.*from") {
        Write-Host "Adding Grid2 import to: $($_.Name)"
        
        # Find the last @mui/material import and add Grid2 import after it
        if ($content -match "} from '@mui/material';") {
            $content = $content -replace "(} from '@mui/material';)", "`$1`nimport Grid2 from '@mui/material/Grid2';"
        } else {
            # If no @mui/material import, add it at the top after React import
            $content = $content -replace "(import React.*';)", "`$1`nimport Grid2 from '@mui/material/Grid2';"
        }
        
        Set-Content $_.FullName -Value $content -NoNewline
    }
}

Write-Host "Grid2 imports added!"