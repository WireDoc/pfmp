# Final Grid2 syntax fix - Convert remaining xs={} md={} to size={{ xs: , md:  }}
$sourceDir = "P:\pfmp-frontend\src"

Get-ChildItem -Path $sourceDir -Recurse -Include "*.tsx" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $original = $content
    
    # Fix all Grid2 with old syntax
    $content = $content -replace "Grid2\s+xs=\{(\d+)\}\s+sm=\{(\d+)\}\s+md=\{(\d+)\}\s+lg=\{(\d+)\}", "Grid2 size={{ xs: `$1, sm: `$2, md: `$3, lg: `$4 }}"
    $content = $content -replace "Grid2\s+xs=\{(\d+)\}\s+sm=\{(\d+)\}\s+md=\{(\d+)\}", "Grid2 size={{ xs: `$1, sm: `$2, md: `$3 }}"
    $content = $content -replace "Grid2\s+xs=\{(\d+)\}\s+md=\{(\d+)\}\s+lg=\{(\d+)\}", "Grid2 size={{ xs: `$1, md: `$2, lg: `$3 }}"
    $content = $content -replace "Grid2\s+xs=\{(\d+)\}\s+md=\{(\d+)\}", "Grid2 size={{ xs: `$1, md: `$2 }}"
    $content = $content -replace "Grid2\s+xs=\{(\d+)\}\s+sm=\{(\d+)\}", "Grid2 size={{ xs: `$1, sm: `$2 }}"
    $content = $content -replace "Grid2\s+xs=\{(\d+)\}\s+lg=\{(\d+)\}", "Grid2 size={{ xs: `$1, lg: `$2 }}"
    $content = $content -replace "Grid2\s+xs=\{(\d+)\}", "Grid2 size={{ xs: `$1 }}"
    
    if ($content -ne $original) {
        Set-Content $_.FullName -Value $content -NoNewline
        Write-Host "Fixed Grid2 syntax in: $($_.Name)"
    }
}

Write-Host "Grid2 syntax fix completed!"
