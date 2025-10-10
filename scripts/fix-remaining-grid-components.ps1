# Fix remaining Grid components to Grid2 in all files
$sourceDir = "P:\pfmp-frontend\src"

Get-ChildItem -Path $sourceDir -Recurse -Include "*.tsx" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $originalContent = $content
    
    # Replace <Grid with <Grid2 (except Grid2 which is already correct)
    $content = $content -replace '<Grid(?!2)', '<Grid2'
    $content = $content -replace '</Grid>', '</Grid2>'
    $content = $content -replace 'Grid container', 'Grid2 container'
    $content = $content -replace 'Grid item', 'Grid2'
    
    if ($content -ne $originalContent) {
        Write-Host "Fixing Grid components in: $($_.Name)"
        Set-Content $_.FullName -Value $content -NoNewline
    }
}

Write-Host "Grid component fixes complete!"
