# PFMP MCP Bridge

This lightweight Node.js script connects GitHub Copilot (or any MCP stdio client) to the HTTP/SSE endpoint exposed by the PFMP MCP PostgreSQL server running on Ubuntu.

## Prerequisites

- Node.js 20 or newer installed on Windows
- Network access from Windows to the Ubuntu host (default endpoint: `http://192.168.1.110:3000/sse`)

## Setup

```powershell
cd C:\pfmp\mcp-bridge
npm install
```

## Usage

To run the bridge manually and verify connectivity:

```powershell
node .\bridge.mjs http://192.168.1.110:3000/sse
```

Press `Ctrl+C` to stop the bridge.

The bridge is registered in `C:\Users\wired\AppData\Roaming\Code\User\mcp.json` so GitHub Copilot can launch it automatically:

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

When Copilot starts the MCP server it will execute the bridge, which in turn connects to the remote SSE endpoint and relays messages between stdio and HTTP.
