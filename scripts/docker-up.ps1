param(
    [switch]$Rebuild
)
$ErrorActionPreference = 'Stop'
if ($Rebuild) {
  docker compose -f docker/docker-compose.yml build api
}
Write-Host 'Starting compose stack (db + api)' -ForegroundColor Cyan
docker compose -f docker/docker-compose.yml up -d
Write-Host 'Current container status:' -ForegroundColor Yellow
docker compose -f docker/docker-compose.yml ps
