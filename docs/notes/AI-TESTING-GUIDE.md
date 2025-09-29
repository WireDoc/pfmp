# AI Recommendations Testing Guide

## Overview

This guide provides comprehensive testing strategies for the PFMP AI-powered recommendations system. The system uses Azure OpenAI (GPT-4) with intelligent fallback logic when AI services are unavailable.

## AI System Architecture

### 🤖 AI Endpoints Available
1. **`GET /api/tasks/ai/recommendations?userId={id}`** - Generate personalized task recommendations
2. **`POST /api/tasks/ai/priority`** - Get AI priority recommendations for tasks
3. **`POST /api/tasks/ai/category`** - AI task categorization based on content
4. **`GET /api/tasks/ai/portfolio-analysis?userId={id}`** - Comprehensive portfolio analysis
5. **`GET /api/tasks/ai/market-alerts?userId={id}`** - AI-generated market alerts

### 🔄 Fallback Logic
When Azure OpenAI is unavailable (no API key), the system uses intelligent rule-based logic to ensure continuity of service.

## Testing Strategy

### Phase 1: Environment Setup ✅

#### Prerequisites
- ✅ API running on http://localhost:5052
- ✅ PostgreSQL database with test users seeded
- ✅ Authentication bypass enabled for development
- ✅ 4 test users with different demographics

**💡 IMPORTANT**: Always use the `start-dev-servers.bat` file to start both API and frontend servers. This ensures proper initialization and avoids issues with manual `dotnet run` commands.

```bash
# Start both servers (recommended method)
cd W:\pfmp
.\start-dev-servers.bat
```

**🗄️ DATABASE TOOLS AVAILABLE**: PostgreSQL client tools (psql) and pgAdmin 4 are now installed. See `DATABASE-TOOLS-SETUP.md` for post-restart setup and validation queries. Use these for rapid data validation and AI logic debugging.

#### Test Users Available
- **Sarah Johnson (ID: 1)**: Age 22, GS-07, high risk tolerance
- **Michael Smith (ID: 2)**: Age 43, GS-13, 15yr service, VA disability  
- **Jessica Rodriguez (ID: 3)**: Age 28, E-6 military, moderate-high risk
- **David Wilson (ID: 4)**: Age 26, GS-09, incomplete profile

### Phase 2: Fallback Logic Testing

#### 2.1 Test AI Endpoints Without OpenAI
Since we're in development mode without OpenAI API keys, test all endpoints to validate fallback behavior:

**Testing Commands:**
```bash
# 1. Task Recommendations (Fallback)
curl -X GET "http://localhost:5052/api/tasks/ai/recommendations?userId=1"

# 2. Task Priority (Fallback)  
curl -X POST "http://localhost:5052/api/tasks/ai/priority" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "type": 1,
    "title": "Emergency Fund Setup",
    "description": "Need to establish emergency fund for 6 months expenses"
  }'

# 3. Task Categorization (Fallback)
curl -X POST "http://localhost:5052/api/tasks/ai/category" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "title": "Rebalance TSP Allocation",
    "description": "Current allocation is 80% G Fund, should diversify"
  }'

# 4. Portfolio Analysis (Fallback)
curl -X GET "http://localhost:5052/api/tasks/ai/portfolio-analysis?userId=1"

# 5. Market Alerts (Fallback)
curl -X GET "http://localhost:5052/api/tasks/ai/market-alerts?userId=1"
```

**Expected Results:**
- ✅ All endpoints should return 200 OK (not 500 errors)
- ✅ Fallback logic provides reasonable recommendations
- ✅ Different users get appropriate responses based on their demographics

#### 2.2 Validate Fallback Recommendations Quality

**Emergency Fund Testing:**
- Users without emergency fund → High priority emergency fund task
- Users with adequate emergency fund → Portfolio optimization tasks

**Risk-Based Recommendations:**
- High risk tolerance (Sarah, 22) → Aggressive growth recommendations
- Moderate risk (Michael, 43) → Balanced portfolio recommendations
- Military (Jessica) → TSP-specific recommendations

### Phase 3: Age-Demographic Testing

#### 3.1 Test Age-Based Recommendation Differences

Test the same request against different user demographics:

```bash
# Test with 22-year-old (Sarah) - Should get aggressive recommendations
curl -X GET "http://localhost:5052/api/tasks/ai/recommendations?userId=1"

# Test with 43-year-old (Michael) - Should get balanced recommendations  
curl -X GET "http://localhost:5052/api/tasks/ai/recommendations?userId=2"

# Test with 28-year-old military (Jessica) - Should get TSP recommendations
curl -X GET "http://localhost:5052/api/tasks/ai/recommendations?userId=3"
```

**Expected Differences:**
- **Sarah (22)**: Long-term growth, aggressive allocation, debt management
- **Michael (43)**: Catch-up contributions, balanced risk, retirement planning
- **Jessica (28)**: TSP optimization, military-specific benefits

#### 3.2 Priority Recommendation Testing

Test identical task requests with different users to see priority variations:

```bash
# Same task, different users - should get different priorities based on age/situation
curl -X POST "http://localhost:5052/api/tasks/ai/priority" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "title": "Increase TSP Contribution",
    "description": "Currently contributing 5%, consider increasing"
  }'
```

### Phase 4: Portfolio Integration Testing

#### 4.1 Create Sample Account Data

First, add some sample accounts and holdings for more realistic AI analysis:

```sql
-- Sample accounts for Sarah (userId=1) - Young aggressive investor
INSERT INTO "Accounts" ("UserId", "AccountType", "Institution", "AccountNumber", "CurrentBalance", "IsActive")
VALUES 
(1, 'TSP', 'Thrift Savings Plan', 'TSP-001', 25000.00, true),
(1, 'Roth IRA', 'Vanguard', 'VGRD-001', 15000.00, true),
(1, 'Checking', 'USAA', 'CHK-001', 3000.00, true);

-- Sample accounts for Michael (userId=2) - Mid-career balanced
INSERT INTO "Accounts" ("UserId", "AccountType", "Institution", "AccountNumber", "CurrentBalance", "IsActive")  
VALUES
(2, 'TSP', 'Thrift Savings Plan', 'TSP-002', 185000.00, true),
(2, 'Traditional IRA', 'Fidelity', 'FID-001', 45000.00, true),
(2, 'Emergency Fund', 'Navy Federal', 'SAV-001', 25000.00, true);
```

#### 4.2 Test Portfolio Analysis with Real Data

```bash
# Test portfolio analysis with account data
curl -X GET "http://localhost:5052/api/tasks/ai/portfolio-analysis?userId=1"
curl -X GET "http://localhost:5052/api/tasks/ai/portfolio-analysis?userId=2"
```

**Expected Results:**
- Portfolio summaries include actual account balances
- Recommendations reflect portfolio size and allocation
- Age-appropriate risk recommendations

### Phase 5: Task Generation Workflow Testing

#### 5.1 End-to-End Task Generation

Test the complete workflow: AI recommendation → Task creation → Task management

```bash
# 1. Get AI recommendations
RECOMMENDATIONS=$(curl -s -X GET "http://localhost:5052/api/tasks/ai/recommendations?userId=1")

# 2. Create task from recommendation
curl -X POST "http://localhost:5052/api/tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "type": 1,
    "title": "AI Recommendation: Emergency Fund",
    "description": "Build emergency fund based on AI analysis",
    "priority": 3
  }'

# 3. Verify task creation
curl -X GET "http://localhost:5052/api/tasks?userId=1"
```

#### 5.2 Alert-to-Task Integration Testing

Test converting AI-generated alerts into actionable tasks:

```bash
# Generate market alerts
curl -X GET "http://localhost:5052/api/tasks/ai/market-alerts?userId=1"

# Create alert-based task (would typically be done through AlertsController)
curl -X POST "http://localhost:5052/api/tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "type": 1,
    "title": "Market Alert Action",
    "description": "Take action based on AI market analysis",
    "priority": 2
  }'
```

## Testing Scenarios

### Scenario 1: New Young Employee (Sarah, 22)
**Context**: Just started government job, minimal savings, high risk tolerance

**Test Cases:**
- Emergency fund prioritization
- Aggressive growth recommendations
- TSP contribution optimization for long timeline
- Debt management (student loans)

**Expected AI Behavior:**
- High priority on emergency fund
- Recommend aggressive TSP allocation (C/S/I funds)
- Long-term investment horizon considerations
- Education on compound interest benefits

### Scenario 2: Mid-Career Employee (Michael, 43)  
**Context**: 15 years service, significant TSP balance, VA disability income

**Test Cases:**
- Catch-up contribution recommendations
- Portfolio rebalancing with moderate risk
- Retirement timeline planning
- VA disability income integration

**Expected AI Behavior:**
- Balanced portfolio recommendations
- Catch-up contribution reminders (over 50)
- Consider guaranteed VA income in retirement planning
- Focus on wealth preservation + growth

### Scenario 3: Military Member (Jessica, 28)
**Context**: Active duty, TSP participation, deployment considerations

**Test Cases:**
- Military-specific TSP benefits
- SDP (Savings Deposit Program) opportunities
- Deployment tax benefits
- Career transition planning

**Expected AI Behavior:**
- TSP matching optimization
- SDP recommendations during deployment
- Tax-advantaged savings during combat exclusion
- Military retirement vs civilian transition planning

### Scenario 4: Incomplete Profile (David, 26)
**Context**: New user with 25% profile completion

**Test Cases:**
- Profile completion prompts
- Basic financial health assessment
- Setup wizard guidance
- Conservative recommendations until profile complete

**Expected AI Behavior:**
- Prioritize profile completion
- Generic financial planning recommendations
- Setup workflow guidance
- Conservative approach due to unknown risk tolerance

## Validation Criteria

### ✅ Functional Requirements
- [ ] All endpoints return valid responses (200 OK)
- [ ] Fallback logic works when OpenAI unavailable
- [ ] Different users receive personalized recommendations
- [ ] Task priorities reflect user demographics
- [ ] Portfolio analysis includes actual account data

### ✅ Business Logic Requirements  
- [ ] Young users get aggressive growth recommendations
- [ ] Mid-career users get balanced portfolio advice
- [ ] Military users get TSP/military-specific recommendations
- [ ] Emergency fund prioritized for users without adequate savings
- [ ] Risk tolerance reflected in investment recommendations

### ✅ Integration Requirements
- [ ] AI recommendations can be converted to tasks
- [ ] Task categorization works accurately
- [ ] Portfolio analysis reflects database account data
- [ ] User demographics influence all AI endpoints
- [ ] Alert generation integrates with task management

## Performance Testing

### Response Time Benchmarks
- **Fallback Mode**: < 500ms per endpoint
- **With OpenAI**: < 3 seconds per endpoint (network dependent)
- **Portfolio Analysis**: < 2 seconds (database query + AI processing)

### Load Testing
```bash
# Test concurrent requests
for i in {1..10}; do
  curl -X GET "http://localhost:5052/api/tasks/ai/recommendations?userId=$((i % 4 + 1))" &
done
wait
```

## Error Handling Testing

### Test Error Scenarios
1. **Invalid User ID**: `userId=999` (non-existent)
2. **Malformed Requests**: Invalid JSON in POST requests
3. **Empty Portfolio**: User with no accounts/holdings
4. **Network Issues**: Simulate OpenAI timeout (when configured)

### Expected Error Responses
- Invalid user: 400 Bad Request with meaningful message
- Malformed JSON: 400 Bad Request with validation errors  
- Empty portfolio: 200 OK with basic recommendations
- Service unavailable: Graceful fallback to rule-based logic

## Documentation and Reporting

### Test Results Template
```markdown
## AI Testing Results - [Date]

### Test Environment
- API Version: [version]
- Database: PostgreSQL with [X] test users
- OpenAI Status: [Available/Fallback Mode]

### Endpoint Testing Results
- Task Recommendations: ✅/❌ 
- Priority Assessment: ✅/❌
- Task Categorization: ✅/❌  
- Portfolio Analysis: ✅/❌
- Market Alerts: ✅/❌

### Age-Based Testing
- Sarah (22): [Results summary]
- Michael (43): [Results summary]  
- Jessica (28): [Results summary]
- David (26): [Results summary]

### Performance Metrics
- Average Response Time: [X]ms
- Fallback Accuracy: [X]%
- Error Rate: [X]%
```

## Testing Status: COMPLETED ✅

**Date Completed**: September 24, 2025  
**Results**: See `AI-TESTING-RESULTS.md` for detailed test results

### ✅ What Was Successfully Tested
- All 5 AI endpoints functional with intelligent fallback logic
- Portfolio analysis with real account data ($45K, $260K, $110K portfolios)  
- Age-based and demographics-based recommendation differences
- Task prioritization and categorization accuracy
- Error handling and performance validation

### 🚀 Key Findings
- **Fallback Logic Works Excellently**: System provides meaningful recommendations without OpenAI
- **Data-Driven Personalization**: Different users get appropriate recommendations based on portfolio size and demographics
- **Military Recognition**: Jessica gets multiple recommendations including emergency fund guidance
- **Performance**: All endpoints respond in <300ms with intelligent caching

## Next Steps

1. ✅ **Immediate Testing**: COMPLETED - All fallback testing validated
2. ✅ **Data Enhancement**: COMPLETED - Sample accounts/goals added for all test users
3. **OpenAI Integration**: Configure real OpenAI API key for enhanced AI capabilities
4. **Automated Testing**: Create unit/integration tests for continuous validation
5. **User Acceptance Testing**: Get feedback on AI recommendation quality from real users

## Troubleshooting

### Common Issues
- **500 Errors**: Check database connection and user existence
- **Empty Recommendations**: Verify user has demographic data populated
- **Slow Responses**: Monitor database query performance
- **Inconsistent Results**: Validate fallback logic implementations

### Debugging Tips
```bash
# Check application logs
tail -f logs/application.log

# Verify test user data
curl -X GET "http://localhost:5052/api/users/1"

# Test database connectivity
curl -X GET "http://localhost:5052/api/users"
```