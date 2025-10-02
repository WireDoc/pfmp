param(
    [switch]$NoCache
)
$ErrorActionPreference = 'Stop'
$tag = 'pfmp-api:local'
$cacheArg = $NoCache.IsPresent ? '--no-cache' : ''
Write-Host "Building API image $tag (docker/api/Dockerfile)" -ForegroundColor Cyan
docker build $cacheArg -t $tag -f docker/api/Dockerfile .
