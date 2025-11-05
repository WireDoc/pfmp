# MCP PostgreSQL Server Integration

**Status**: ✅ Operational (2025-11-05)  
**Location**: Ubuntu 22.04 at `192.168.1.110` (HTTP/SSE on port 3000)  
**Bridge**: `C:\pfmp\mcp-bridge` (Windows stdio-to-HTTP relay)

## Overview

The PFMP project integrates a custom Model Context Protocol (MCP) server that exposes PostgreSQL database operations to AI assistants (GitHub Copilot, Claude, etc.). This enables natural-language queries for schema inspection, data manipulation, and user data cloning without manual SQL.

## Architecture

```
Windows VS Code (Copilot)
    ↓ stdio
C:\pfmp\mcp-bridge\bridge.mjs
    ↓ HTTP/SSE
Ubuntu MCP Server (192.168.1.110:3000)
    ↓ PostgreSQL driver
Synology NAS (192.168.1.108:5433)
    └─ pfmp_dev database
```

**Key components**:
- **MCP Server** (`/home/taurus519/pfmp/mcp-pfmp-postgres/`): Node.js/TypeScript service exposing 5 tools via MCP protocol
- **Bridge** (`C:\pfmp\mcp-bridge\`): Lightweight Node.js relay converting stdio (VS Code) to SSE (remote server)
- **Configuration**: `C:\Users\wired\AppData\Roaming\Code\User\mcp.json` registers the bridge with VS Code

## Available Tools

### 1. `list_tables`
Lists all tables in the database with row counts and `UserId` column detection.

**Parameters**:
- `schema` (optional): Database schema name (default: `public`)

**Example**:
```
Using MCP Postgres, list the tables
```

### 2. `get_table_schema`
Get detailed schema information for a specific table including columns, types, constraints, and foreign keys.

**Parameters**:
- `tableName` (required): Name of the table to inspect
- `schema` (optional): Database schema name (default: `public`)

**Example**:
```
Using MCP Postgres, get the schema for the Accounts table
```

### 3. `execute_query`
Execute a SQL query with parameter binding. Supports both read and write operations with safety checks.

**Parameters**:
- `sql` (required): SQL query to execute
- `params` (optional): Query parameters for prepared statement (default: `[]`)
- `mode` (optional): Query mode `read` or `write` (default: `read`)

**Example**:
```
Using MCP Postgres, execute the query: SELECT * FROM "Users" WHERE "Id" = $1 with params [1]
```

### 4. `clone_user_data`
Clone all data for a user to another user, handling foreign keys and ID mapping automatically.

**Parameters**:
- `sourceUserId` (required): ID of the user to clone data from
- `targetUserId` (required): ID of the user to clone data to
- `includeTables` (optional): Specific tables to clone (default: all user tables)
- `schema` (optional): Database schema name (default: `public`)

**Example**:
```
Using MCP Postgres, clone user data from user 1 to user 10
```

### 5. `get_foreign_keys`
Get all foreign key relationships for a specific table or all tables.

**Parameters**:
- `tableName` (optional): Specific table name to get foreign keys for
- `schema` (optional): Database schema name (default: `public`)

**Example**:
```
Using MCP Postgres, get foreign keys for the Accounts table
```

## Setup & Configuration

### Prerequisites
- Node.js 20+ installed on Windows
- Network access from Windows to Ubuntu host (`192.168.1.110:3000`)
- MCP server running on Ubuntu (managed via systemd)

### Bridge Installation

```powershell
cd C:\pfmp\mcp-bridge
npm install
```

### VS Code Configuration

The bridge is registered in `C:\Users\wired\AppData\Roaming\Code\User\mcp.json`:

```json
{
  "servers": {
    "pfmp-postgres": {
      "command": "node",
      "args": [
        "C:\\pfmp\\mcp-bridge\\bridge.mjs",
        "http://192.168.1.110:3000/sse"
      ]
    }
  }
}
```

### Testing the Connection

Run the test client to verify connectivity:

```powershell
cd C:\pfmp\mcp-bridge
node .\test-client.mjs
```

This will connect to the MCP server, list available tools, and execute a sample `list_tables` query.

## Usage in AI Assistants

Once configured, you can use natural language to interact with the database:

**Schema exploration**:
- "Using MCP Postgres, list all tables"
- "Using MCP Postgres, show me the schema for the Users table"
- "Using MCP Postgres, what are the foreign keys in the Accounts table?"

**Data queries**:
- "Using MCP Postgres, how many users are in the database?"
- "Using MCP Postgres, show me the first 5 accounts"
- "Using MCP Postgres, find all financial profiles for user 1"

**Data operations**:
- "Using MCP Postgres, clone all data from user 1 to user 15"

## Ubuntu Server Management

The MCP server runs as a systemd service on Ubuntu:

```bash
# Check status
sudo systemctl status mcp-pfmp-postgres

# View logs
sudo journalctl -u mcp-pfmp-postgres -f

# Restart service
sudo systemctl restart mcp-pfmp-postgres

# Rebuild and restart
cd /home/taurus519/pfmp/mcp-pfmp-postgres
npm run build
sudo systemctl restart mcp-pfmp-postgres
```

## Troubleshooting

### Bridge won't connect
1. Verify the Ubuntu server is running: `ssh taurus519@192.168.1.110 "sudo systemctl status mcp-pfmp-postgres"`
2. Check firewall allows port 3000
3. Test HTTP endpoint: `curl http://192.168.1.110:3000/sse`

### VS Code doesn't see the server
1. Verify `mcp.json` exists at `C:\Users\wired\AppData\Roaming\Code\User\mcp.json`
2. Reload VS Code window
3. Check the MCP extension is enabled

### Query errors
- Ensure table names are double-quoted for PostgreSQL case sensitivity: `"Users"`, `"Accounts"`
- Use parameterized queries to avoid SQL injection: `SELECT * FROM "Users" WHERE "Id" = $1` with `params: [1]`
- Check server logs on Ubuntu for detailed error messages

## Files & Locations

**Windows**:
- Bridge: `C:\pfmp\mcp-bridge\`
- Config: `C:\Users\wired\AppData\Roaming\Code\User\mcp.json`
- Test client: `C:\pfmp\mcp-bridge\test-client.mjs`

**Ubuntu**:
- Server: `/home/taurus519/pfmp/mcp-pfmp-postgres/`
- Service: `/etc/systemd/system/mcp-pfmp-postgres.service`
- Logs: `journalctl -u mcp-pfmp-postgres`

**Database**:
- Host: `192.168.1.108:5433`
- Database: `pfmp_dev`
- User: `pfmp_user`

## Related Documentation

- `docs/dev/mcp-server-project-spec.md` - Original MCP server specification
- `docs/data/database-overview.md` - Database schema and conventions
- `README.md` - Main project overview
