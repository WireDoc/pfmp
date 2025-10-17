# PFMP API Documentation

## Overview
The PFMP API is a .NET 9 Web API providing AI-powered financial management services for government employees and military members.

**Base URL**: `http://localhost:5052/api`  
**Environment**: Development (Authentication Bypassed)  
**Database**: PostgreSQL on Synology NAS (192.168.1.108:5433)

## Authentication

### Development Mode
Authentication is bypassed in development environment. All endpoints are accessible without authentication headers.

**Configuration**: `Development:BypassAuthentication: true`

### Test Users
4 pre-configured test users available (see README.md for detailed profiles):
- `userId=1`: Sarah Johnson (22, GS-07, 1 year service) 
- `userId=2`: Michael Smith (43, GS-13, 15 years service, 30% VA disability)
- `userId=3`: Jessica Rodriguez (28, E-6, 8 years military service)
- `userId=4`: David Wilson (26, GS-09, incomplete setup)

## Core Controllers

### Users Controller
**Base Route**: `/api/users`

#### Get All Users
```http
GET /api/users
```
**Response**: Array of all users (including test accounts in development)

#### Get User by ID
```http
GET /api/users/{id}
```
**Parameters**:
- `id` (int): User ID (1-4 for test users)

**Response**: Complete user profile with demographics, employment, and setup status

#### Update User
```http
PUT /api/users/{id}
```
**Body**: User object with updated fields

### Tasks Controller  
**Base Route**: `/api/tasks`

#### Get User Tasks
```http
GET /api/tasks?userId={userId}&status={status}&type={type}&priority={priority}
```
**Parameters**:
- `userId` (int, required): User ID to filter tasks
- `status` (enum, optional): Pending, Accepted, InProgress, Completed, Dismissed
- `type` (enum, optional): Rebalancing, StockPurchase, TaxLossHarvesting, etc.
- `priority` (enum, optional): Low, Medium, High, Critical

#### Create Task
```http
POST /api/tasks
```
**Body**:
```json
{
  "userId": 1,
  "title": "Review Portfolio Allocation",
  "description": "Quarterly rebalancing review",
  "type": "Rebalancing",
  "priority": "Medium",
  "dueDate": "2025-10-01T00:00:00Z"
}
```

#### AI-Powered Task Endpoints

##### Get AI Task Recommendations
```http
GET /api/tasks/ai/recommendations?userId={userId}
```
**Description**: Generates personalized task recommendations based on user profile, age, employment type, and portfolio analysis.

**Response**: Array of recommended tasks with AI-driven priorities

##### Get AI Priority Recommendation
```http
POST /api/tasks/ai/priority
```
**Body**:
```json
{
  "title": "Increase TSP Contribution",
  "description": "Consider increasing contribution to maximize employer match"
}
```
**Response**: Recommended priority level based on task content and user profile

##### Get AI Task Categorization
```http
POST /api/tasks/ai/category
```
**Body**:
```json
{
  "title": "Review emergency fund balance",
  "description": "Ensure 6-month expense coverage"
}
```
**Response**: Recommended task type/category

##### Get AI Portfolio Analysis
```http
GET /api/tasks/ai/portfolio-analysis?userId={userId}
```
**Description**: Comprehensive AI analysis of user's portfolio with actionable insights

**Response**: Detailed text analysis considering age, risk tolerance, and financial goals

##### Get AI Market Alerts
```http
GET /api/tasks/ai/market-alerts?userId={userId}
```
**Description**: AI-generated market alerts relevant to user's portfolio and profile

**Response**: Array of market-based alert objects

### Alerts Controller
**Base Route**: `/api/alerts`

#### Get User Alerts
```http
GET /api/alerts?userId={userId}&isActive={isActive}&isRead={isRead}&isDismissed={isDismissed}
```
**Parameters**:
- `userId` (int, required): User ID
- `isActive` (bool, optional): Filter for active alerts (not dismissed and not expired)
- `isRead` (bool, optional): Filter by read status
- `isDismissed` (bool, optional): Filter by dismissed status

#### Create Alert
```http
POST /api/alerts
```
**Body**:
```json
{
  "userId": 1,
  "title": "Portfolio Rebalancing Needed",
  "message": "Your portfolio has drifted 6% from target allocation",
  "severity": "Medium",
  "category": "Portfolio",
  "isActionable": true,
  "expiresAt": "2025-10-15T00:00:00Z"
}
```

#### Alert Lifecycle Management

##### Mark Alert as Read
```http
PATCH /api/alerts/{id}/read
```
**Description**: Marks alert as read (sets `IsRead = true`, `ReadAt = timestamp`)

##### Dismiss Alert
```http
PATCH /api/alerts/{id}/dismiss
```  
**Description**: Dismisses alert (sets `IsDismissed = true`, `DismissedAt = timestamp`). Also marks as read if not already read.

##### Un-dismiss Alert
```http
PATCH /api/alerts/{id}/undismiss
```
**Description**: Reverses dismissal (sets `IsDismissed = false`, `DismissedAt = null`) - allows users to see dismissed alerts again

#### Advice Generation from Alerts

##### Generate Advice from Alert
```http
POST /api/alerts/{alertId}/generate-advice
```
**Description**: Generates an advice record from an actionable alert. Captures the alert snapshot for provenance. Accepting the advice will create a task.

**Response**: Created advice object (status = Proposed) with `sourceAlertId` and `sourceAlertSnapshot` populated.

> Note: Direct alert→task generation has been replaced by alert→advice→(accept)→task to ensure human-in-the-loop acknowledgment.

### Accounts Controller
**Base Route**: `/api/accounts`

#### Get User Accounts
```http
GET /api/accounts?userId={userId}
```
**Response**: All financial accounts for the user (TSP, bank accounts, investment accounts)

#### TSP Integration
Complete 16-fund TSP management:
- Individual Funds: G, F, C, S, I
- Lifecycle Funds: L Income, L2030-L2075

### Financial Profile – TSP
**Base Route**: `/api/financial-profile/{userId}/tsp`

#### Upsert TSP Profile
```http
POST /api/financial-profile/{userId}/tsp
```
Body includes core allocation and lifecycle positions:
```json
{
  "currentBalance": 25000,
  "gFundPercent": 40,
  "fFundPercent": 10,
  "cFundPercent": 30,
  "sFundPercent": 10,
  "iFundPercent": 10,
  "lifecyclePositions": [
    { "fundCode": "L2030", "allocationPercent": 10, "units": 100 }
  ]
}
```

#### Get TSP Profile
```http
GET /api/financial-profile/{userId}/tsp
```

#### Get TSP Summary (computed)
```http
GET /api/financial-profile/{userId}/tsp/summary
```
Returns computed items with market prices, including each fund's current value and current mix % based on normalized price keys.

#### Create Daily TSP Snapshot (idempotent)
```http
POST /api/financial-profile/{userId}/tsp/snapshot
```
Creates at most one snapshot per day per user, keyed by prior-market-close as-of (weekend-aware). Safe to call repeatedly.

#### Get Latest TSP Snapshot Metadata
```http
GET /api/financial-profile/{userId}/tsp/snapshot/latest
```
Returns the as-of date/time and record id of the most recent snapshot.

### Goals Controller  
**Base Route**: `/api/goals`

#### Get User Goals
```http
GET /api/goals?userId={userId}
```
**Response**: Financial goals with progress tracking and target dates

## Error Handling

### Standard Error Responses
```json
{
  "error": "Error message description",
  "details": "Additional error context"
}
```

### Common HTTP Status Codes
- `200 OK`: Successful request
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request data
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

## Data Models

### User Profile Structure
```json
{
  "userId": 1,
  "firstName": "Sarah",
  "lastName": "Johnson", 
  "email": "sarah.johnson@test.gov",
  "dateOfBirth": "2003-01-15T00:00:00Z",
  "employmentType": "Federal",
  "payGrade": "GS-07",
  "serviceComputationDate": "2024-01-01T00:00:00Z",
  "retirementSystem": "FERS",
  "annualIncome": 42000,
  "riskTolerance": 8,
  "profileSetupComplete": true,
  "setupProgressPercentage": 100,
  "isTestAccount": true,
  "bypassAuthentication": true
}
```

### Task Structure  
```json
{
  "taskId": 1,
  "userId": 1,
  "type": "Rebalancing",
  "title": "Quarterly Portfolio Rebalance",
  "description": "Review and adjust portfolio allocation",
  "priority": "Medium",
  "status": "Pending",
  "createdDate": "2025-10-01T10:00:00Z",
  "dueDate": "2025-10-08T00:00:00Z",
  "sourceAdviceId": 12,
  "sourceType": "AdviceAcceptance",
  "sourceAlertId": 5,
  "estimatedImpact": 1500.00,
  "confidenceScore": 0.85
}
```

### Advice Structure
```json
{
  "adviceId": 12,
  "userId": 1,
  "status": "Proposed", 
  "title": "Rebalance portfolio toward target weights",
  "description": "Detected 6% drift from target allocation; propose rebalancing within ±2% bands.",
  "generationMethod": "AlertConversion",
  "sourceAlertId": 5,
  "sourceAlertSnapshot": { "alertId":5, "title":"Portfolio Rebalancing Needed", "severity":"Medium" },
  "previousStatus": null,
  "acceptedAt": null,
  "dismissedAt": null,
  "linkedTaskId": null
}
```

#### Advice Lifecycle
States:
- Proposed (initial)
- Accepted (terminal; task auto-created if not already created)
- Dismissed (terminal)

Acceptance Behavior:
- Creates a task (if none) and sets `linkedTaskId`, `previousStatus`, `acceptedAt`.
- Idempotent: re-accepting returns existing linkage.

Dismiss Behavior:
- Sets `dismissedAt`, `previousStatus` and finalizes lifecycle without creating a task.

Provenance Fields:
- `sourceAlertId` / `sourceAlertSnapshot` (originating alert context)
- `generationMethod` (e.g., AlertConversion, DirectGeneration)
- `previousStatus` (for auditing transitions)
- `linkedTaskId` (task created upon acceptance)

### Alert Structure
```json
{
  "alertId": 1,
  "userId": 1,
  "title": "Market Volatility Alert",
  "message": "Increased market volatility detected in your portfolio",
  "severity": "Medium",
  "category": "Portfolio",
  "isRead": false,
  "isDismissed": false,
  "isActionable": true,
  "taskGenerated": false,
  "createdAt": "2025-09-24T10:00:00Z",
  "expiresAt": "2025-10-24T10:00:00Z"
}
```

## Development Configuration

### Database Connection
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=192.168.1.108;Port=5433;Database=pfmp_dev;Username=pfmp_user;Password=MediaPword.1;Include Error Detail=true"
  }
}
```

### AI Service Configuration  
```json
{
  "OpenAI": {
    "ApiKey": "development-openai-api-key-here",
    "Endpoint": "https://api.openai.com/v1", 
    "Model": "gpt-4"
  }
}
```

### Development Flags
```json
{
  "Development": {
    "BypassAuthentication": true,
    "SeedTestData": true,
    "DefaultTestUserId": 1
  }
}
```

## Testing Examples

### Test AI Recommendations for Different User Types
```bash
# Young employee (aggressive strategy)
curl "http://localhost:5052/api/tasks/ai/recommendations?userId=1"

# Mid-career employee (balanced approach)  
curl "http://localhost:5052/api/tasks/ai/recommendations?userId=2"

# Military member (military-specific features)
curl "http://localhost:5052/api/tasks/ai/recommendations?userId=3"
```

### Test Alert Workflow
```bash
# Create actionable alert
curl -X POST "http://localhost:5052/api/alerts" \
  -H "Content-Type: application/json" \
  -d '{"userId":1,"title":"Rebalance Portfolio","message":"5% drift detected","severity":"Medium","category":"Portfolio","isActionable":true}'

# Mark as read
curl -X PATCH "http://localhost:5052/api/alerts/1/read"

# Generate advice from alert (task is created upon acceptance of advice)
curl -X POST "http://localhost:5052/api/alerts/1/generate-advice"

# Dismiss alert
curl -X PATCH "http://localhost:5052/api/alerts/1/dismiss"
```

---
**Last Updated**: October 17, 2025  
**API Version**: v0.4.0-alpha
