# Postman Collection Usage

Use the included Postman collection and environment to explore the API quickly.

## Files
- Collection: `PFMP-API/postman/PFMP-API.postman_collection.json`
- Environment: `PFMP-API/postman/PFMP-Local.postman_environment.json`

## Import Steps
1. Open Postman
2. Import the collection JSON
3. Import the environment JSON
4. Select the environment in the top-right of Postman
5. Verify variables:
   - `baseUrl`: `http://localhost:5052`
   - `userId`: `1` (test user)
   - `guid`: random string for unique email generation
   - `refreshToken`: leave blank unless testing refresh flow

## Quick Calls
- Health: `GET {{baseUrl}}/health`
- Auth config: `GET {{baseUrl}}/api/auth/config`
- Dev Users: `GET {{baseUrl}}/api/dev/users`
- Financial Profile (TSP):
  - `GET {{baseUrl}}/api/financial-profile/{{userId}}/tsp`
  - `GET {{baseUrl}}/api/financial-profile/{{userId}}/tsp/summary`
  - `POST {{baseUrl}}/api/financial-profile/{{userId}}/tsp/snapshot`
  - `GET {{baseUrl}}/api/financial-profile/{{userId}}/tsp/snapshot/latest`

## Notes
- Snapshot creation is idempotent (once per day per user). Safe to trigger multiple times.
- Some endpoints assume `Development:BypassAuthentication=true` in `appsettings.Development.json`.
- Swagger UI is available at `{{baseUrl}}/swagger` in Development.
