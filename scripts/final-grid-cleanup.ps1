# Final Grid2 to Grid replacement
$sourceDir = "P:\pfmp-frontend\src"

Get-ChildItem -Path $sourceDir -Recurse -Include "*.tsx" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $originalContent = $content
    
    # Replace ALL remaining Grid2 with Grid
    $content = $content -replace "Grid2", "Grid"
    
    # Clean up Unstable_Grid2 references
    $content = $content -replace "Unstable_Grid2,?\s*", ""
    $content = $content -replace ",\s*Unstable_Grid2", ""
    
    # Clean up duplicate commas and malformed imports
    $content = $content -replace ",\s*,", ","
    $content = $content -replace "{\s*,", "{"
    $content = $content -replace ",\s*}", "}"
    
    if ($content -ne $originalContent) {
        Write-Host "Final Grid cleanup applied to: $($_.Name)"
        Set-Content $_.FullName -Value $content -NoNewline
    }
}

Write-Host "Final Grid cleanup complete!"
