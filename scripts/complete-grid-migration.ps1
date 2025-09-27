# Complete Grid v1 to v2 migration - Replace all Grid with Grid2
$sourceDir = "W:\pfmp\pfmp-frontend\src"

Get-ChildItem -Path $sourceDir -Recurse -Include "*.tsx" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $originalContent = $content
    
    # Replace all Grid imports from @mui/material with Grid2 from @mui/material/Grid2
    $content = $content -replace "import.*Grid.*from '@mui/material'", ""
    $content = $content -replace "Grid,?", ""
    
    # Clean up double commas in import statements
    $content = $content -replace ",\s*,", ","
    $content = $content -replace "{\s*,", "{"
    $content = $content -replace ",\s*}", "}"
    
    # Add Grid2 import if the file uses Grid components
    if ($content -match "<Grid") {
        # Add Grid2 import after React import
        $content = $content -replace "(import React.*';)", "`$1`nimport Grid2 from '@mui/material/Grid2';"
    }
    
    # Replace all <Grid with <Grid2
    $content = $content -replace "<Grid(?!\d)", "<Grid2"
    $content = $content -replace "</Grid>", "</Grid2>"
    
    # Convert container and item props to Grid2 syntax
    $content = $content -replace "(<Grid2[^>]*)\s+container\s+", "`$1 container "
    $content = $content -replace "(<Grid2[^>]*)\s+item\s+", "`$1 "
    
    # Convert xs/sm/md/lg/xl props to size prop
    $content = $content -replace "(<Grid2[^>]*?)(\s+xs=\{?(\d+)\}?)([^>]*?>)", {
        param($match)
        $beforeProps = $match.Groups[1].Value
        $xsValue = $match.Groups[3].Value
        $afterProps = $match.Groups[4].Value
        
        # Extract other size props
        $sizes = @{ xs = $xsValue }
        $remaining = $afterProps
        
        if ($remaining -match "\s+sm=\{?(\d+)\}?") {
            $sizes.sm = $matches[1]
            $remaining = $remaining -replace "\s+sm=\{?\d+\}?", ""
        }
        if ($remaining -match "\s+md=\{?(\d+)\}?") {
            $sizes.md = $matches[1]
            $remaining = $remaining -replace "\s+md=\{?\d+\}?", ""
        }
        if ($remaining -match "\s+lg=\{?(\d+)\}?") {
            $sizes.lg = $matches[1]
            $remaining = $remaining -replace "\s+lg=\{?\d+\}?", ""
        }
        if ($remaining -match "\s+xl=\{?(\d+)\}?") {
            $sizes.xl = $matches[1]
            $remaining = $remaining -replace "\s+xl=\{?\d+\}?", ""
        }
        
        $sizeObj = "{ "
        $sizeObj += ($sizes.GetEnumerator() | ForEach-Object { "$($_.Key): $($_.Value)" }) -join ", "
        $sizeObj += " }"
        
        return "$beforeProps size={{$sizeObj}}$remaining"
    }
    
    if ($content -ne $originalContent) {
        Write-Host "Converting all Grid to Grid2 in: $($_.Name)"
        Set-Content $_.FullName -Value $content -NoNewline
    }
}

Write-Host "Complete Grid v1 to v2 migration finished!"