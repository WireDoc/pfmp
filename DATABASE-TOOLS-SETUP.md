# PostgreSQL Database Tools Setup - Post-Restart Guide

## 🚀 Installation Completed Successfully

✅ **PostgreSQL 17.6** installed via winget  
✅ **pgAdmin 4 v9.8** installed via winget  
✅ **psql command line tools** verified working with full path

## 📁 Installation Locations

### PostgreSQL Command Line Tools
- **Full Path**: `C:\Program Files\PostgreSQL\17\bin\psql.exe`
- **Directory**: `C:\Program Files\PostgreSQL\17\bin\`
- **Other Tools**: pg_dump, pg_restore, createdb, dropdb, etc.

### pgAdmin 4 (GUI)
- **Location**: Start Menu → pgAdmin 4
- **Alternative**: `C:\Program Files\PostgreSQL\17\pgAdmin 4\`

## 🔧 After Restart Commands

### Basic Connection Test
```powershell
# Test psql is in PATH (after restart)
psql --version

# Connect to PFMP database (with password)
$env:PGPASSWORD='MediaPword.1'; psql -h 192.168.1.108 -p 5433 -U pfmp_user -d pfmp_dev

# Connect with NO PAGINATION (recommended for long output)
$env:PGPASSWORD='MediaPword.1'; psql -h 192.168.1.108 -p 5433 -U pfmp_user -d pfmp_dev -P pager=off
```

### Disable Pagination (Important!)
To avoid having to press through pages of output, always use one of these methods:

**Option 1: Command Line Flag (Recommended)**
```powershell
# Add -P pager=off to any psql command
$env:PGPASSWORD='MediaPword.1'; psql -h 192.168.1.108 -p 5433 -U pfmp_user -d pfmp_dev -P pager=off -c '\dt'
```

**Option 2: Set in Session**
```sql
-- Once connected to psql, run:
\pset pager off
```

### PFMP Database Validation Queries

#### 1. Verify Test Users
```sql
-- Check test users were seeded correctly
SELECT "UserId", "FirstName", "LastName", "DateOfBirth", "AnnualIncome", "IsTestAccount" 
FROM "Users" 
WHERE "IsTestAccount" = true
ORDER BY "UserId";
```

#### 2. Validate Account Data for AI Testing
```sql
-- Check account balances match our seeded data
SELECT 
    u."FirstName", 
    u."LastName",
    a."AccountName", 
    a."CurrentBalance", 
    a."AccountType",
    a."Category"
FROM "Users" u 
JOIN "Accounts" a ON u."UserId" = a."UserId"
WHERE u."IsTestAccount" = true
ORDER BY u."UserId", a."CurrentBalance" DESC;
```

#### 3. Verify Goals Data
```sql
-- Check goals were seeded for AI recommendations
SELECT 
    u."FirstName", 
    g."Name", 
    g."TargetAmount", 
    g."CurrentAmount", 
    g."Category",
    g."Priority"
FROM "Users" u
JOIN "Goals" g ON u."UserId" = g."UserId" 
WHERE u."IsTestAccount" = true
ORDER BY u."UserId", g."Priority" DESC;
```

#### 4. Portfolio Summary for AI Testing
```sql
-- Get portfolio totals that should match AI analysis
SELECT 
    u."FirstName",
    u."DateOfBirth",
    u."PayGrade",
    COUNT(a."AccountId") as account_count,
    SUM(a."CurrentBalance") as total_portfolio_value
FROM "Users" u 
LEFT JOIN "Accounts" a ON u."UserId" = a."UserId"
WHERE u."IsTestAccount" = true
GROUP BY u."UserId", u."FirstName", u."DateOfBirth", u."PayGrade"
ORDER BY u."UserId";
```

## 🎯 Expected Results (Based on Our Seeding)

### Test Users Portfolio Summary
- **Sarah Johnson (22, GS-07)**: $45,000 total (3 accounts)
- **Michael Smith (43, GS-13)**: $260,000 total (3 accounts)  
- **Jessica Rodriguez (28, E-6)**: $110,000 total (2 accounts)
- **David Wilson (26, GS-09)**: $0 (incomplete profile)

### Account Breakdown
- **Sarah**: TSP ($25K), Roth IRA ($15K), Emergency Fund ($5K)
- **Michael**: TSP ($185K), Traditional IRA ($45K), Emergency Fund ($30K)
- **Jessica**: Traditional TSP ($85K), Roth TSP ($25K)

## 🔍 AI Testing Validation Commands

### Verify AI Recommendation Logic
```sql
-- Users without emergency funds (should get emergency fund recommendations)
SELECT u."FirstName", u."UserId"
FROM "Users" u
LEFT JOIN "Accounts" a ON u."UserId" = a."UserId" AND a."IsEmergencyFund" = true
WHERE u."IsTestAccount" = true 
  AND a."AccountId" IS NULL;

-- Users with >$10K portfolio (should get rebalancing recommendations) 
SELECT 
    u."FirstName",
    SUM(a."CurrentBalance") as portfolio_value
FROM "Users" u
JOIN "Accounts" a ON u."UserId" = a."UserId"
WHERE u."IsTestAccount" = true
GROUP BY u."UserId", u."FirstName"
HAVING SUM(a."CurrentBalance") > 10000;
```

## 🛠️ pgAdmin 4 Setup

### First Time Setup
1. **Launch pgAdmin 4** from Start Menu
2. **Create Server Connection**:
   - Name: `PFMP Synology`
   - Host: `192.168.1.108`
   - Port: `5433`
   - Database: `pfmp_dev`
   - Username: `pfmp_user`
   - Password: [enter when prompted]

### Useful pgAdmin Features
- **Query Tool**: Execute SQL queries with results grid
- **Schema Browser**: Visual database structure
- **Data Viewer**: Browse table contents
- **Performance Dashboard**: Monitor query performance

## 🚀 Integration with PFMP Development

### Quick Data Validation After API Changes
```powershell
# One-liner to check test users exist (with no pagination)
$env:PGPASSWORD='MediaPword.1'; psql -h 192.168.1.108 -p 5433 -U pfmp_user -d pfmp_dev -P pager=off -c "SELECT COUNT(*) as test_users FROM \"Users\" WHERE \"IsTestAccount\" = true;"

# Check if accounts were seeded
$env:PGPASSWORD='MediaPword.1'; psql -h 192.168.1.108 -p 5433 -U pfmp_user -d pfmp_dev -P pager=off -c "SELECT COUNT(*) as accounts FROM \"Accounts\";"

# Verify goals exist
psql -h 192.168.1.108 -p 5433 -U pfmp_user -d pfmp_dev -c "SELECT COUNT(*) as goals FROM \"Goals\";"
```

### Debug AI Recommendations
```sql
-- When AI gives unexpected recommendations, check the underlying data
-- For user X, what accounts do they have?
SELECT * FROM "Accounts" WHERE "UserId" = 1;

-- What's their profile like?
SELECT "DateOfBirth", "EmploymentType", "PayGrade", "AnnualIncome", "RiskTolerance" 
FROM "Users" WHERE "UserId" = 1;
```

## 🔧 Troubleshooting

### Connection Issues
```powershell
# Test network connectivity to Synology
Test-NetConnection -ComputerName 192.168.1.108 -Port 5433

# Verify PostgreSQL service on Synology is running
# (Check Synology DSM → Package Center → PostgreSQL)
```

### Common SQL Escaping
- **Table Names**: Use double quotes `"Users"`, `"Accounts"`
- **Column Names**: Use double quotes `"UserId"`, `"FirstName"`
- **String Values**: Use single quotes `'GS-07'`, `'Federal'`

## 📊 Performance Testing Queries

### AI Endpoint Performance Baseline
```sql
-- Check query performance for AI recommendations
EXPLAIN ANALYZE 
SELECT u.*, a."CurrentBalance" 
FROM "Users" u 
LEFT JOIN "Accounts" a ON u."UserId" = a."UserId"
WHERE u."UserId" = 1;

-- Index usage validation
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE tablename IN ('Users', 'Accounts', 'Goals');
```

## 🎯 Next Steps After Restart

1. **Verify PATH**: `psql --version` should work
2. **Test Connection**: Connect to PFMP database
3. **Validate Data**: Run the portfolio summary query
4. **Update AI Testing Guide**: Add database validation steps
5. **Integrate with Development**: Use psql for rapid testing during AI development

## 💡 Benefits for PFMP Development

- ✅ **Rapid Data Validation**: Instantly verify seeded test data
- ✅ **AI Logic Debugging**: Check underlying data when AI gives unexpected results  
- ✅ **Performance Monitoring**: Identify slow queries affecting AI endpoints
- ✅ **Data Integrity**: Ensure migrations and seeding work correctly
- ✅ **Production Readiness**: Database tools ready for production debugging

---

**Post-Restart Checklist:**
- [ ] Verify `psql --version` works
- [ ] Connect to PFMP database successfully  
- [ ] Run portfolio summary validation query
- [ ] Update AI testing documentation with database steps
- [ ] Test database queries during next AI development session

---

*Created: September 24, 2025*  
*Status: Ready for restart and PATH variable update*