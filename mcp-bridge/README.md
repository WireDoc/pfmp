# PFMP MCP Bridge

This lightweight Node.js script connects GitHub Copilot (or any MCP stdio client) to the HTTP/SSE endpoint exposed by the PFMP MCP PostgreSQL server running on Ubuntu.

## Features

- **Automatic Reconnection**: Handles network interruptions gracefully with exponential backoff
- **Message Buffering**: Queues messages during reconnection attempts
- **Error Recovery**: Distinguishes between recoverable network errors and fatal failures
- **Connection Monitoring**: Logs connection state changes for debugging

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

## Reconnection Behavior

The bridge automatically handles connection interruptions:

- **Network Errors**: Detects `ECONNRESET`, `ECONNREFUSED`, `ETIMEDOUT`, and SSE errors
- **Retry Logic**: Up to 10 reconnection attempts with 2-second delay between attempts
- **Message Buffering**: Queues incoming stdio messages during reconnection
- **State Recovery**: Flushes buffered messages after successful reconnection

**Error Messages**:
- `[bridge] Connection lost: ...` - Transient network error detected
- `[bridge] Attempting reconnect (N/10)...` - Reconnection attempt in progress
- `[bridge] Reconnected to ...` - Connection restored successfully
- `[bridge] Fatal error: ...` - Unrecoverable error, bridge will exit

## Troubleshooting

**Bridge exits immediately**:
- Check that the Ubuntu MCP server is running: `ssh taurus519@192.168.1.110 "sudo systemctl status mcp-pfmp-postgres"`
- Verify endpoint is reachable: `curl http://192.168.1.110:3000/sse`

**Frequent reconnections**:
- Check network stability between Windows and Ubuntu hosts
- Review Ubuntu MCP server logs: `ssh taurus519@192.168.1.110 "sudo journalctl -u mcp-pfmp-postgres -f"`
- Ensure firewall allows port 3000

**Messages not delivered**:
- Bridge buffers up to the reconnection limit (10 attempts × 2 seconds = 20 seconds max)
- Check VS Code MCP extension logs for client-side errors
- Restart VS Code to reset the bridge connection
