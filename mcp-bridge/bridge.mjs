#!/usr/bin/env node
import EventSource from "eventsource";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// The EventSource polyfill needs to be globally available for the MCP SDK.
global.EventSource = EventSource;

const [, , endpointArg] = process.argv;

if (!endpointArg) {
  console.error("Usage: node bridge.mjs <sse-endpoint-url>");
  process.exit(1);
}

let endpoint;

try {
  endpoint = new URL(endpointArg);
} catch (error) {
  console.error(`Invalid URL provided: ${endpointArg}`);
  process.exit(1);
}

let stdio = new StdioServerTransport();
let sse = null;

let shuttingDown = false;
let sseReady = false;
let reconnecting = false;
const pendingOutgoing = [];

const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY_MS = 2000;
let reconnectAttempts = 0;

const flushPending = () => {
  if (!sseReady || !sse) {
    return;
  }

  while (pendingOutgoing.length > 0) {
    const message = pendingOutgoing.shift();
    sse.send(message).catch((error) => {
      console.error(`[bridge] Failed to send pending message: ${error.message}`);
    });
  }
};

const bail = (error) => {
  if (shuttingDown || reconnecting) {
    return;
  }

  const message =
    error instanceof Error ? error.stack ?? error.message : String(error);
  
  // Check if this is a recoverable network error
  const isNetworkError = 
    message.includes("ECONNRESET") ||
    message.includes("ECONNREFUSED") ||
    message.includes("ETIMEDOUT") ||
    message.includes("SSE error");

  if (isNetworkError && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
    console.error(`[bridge] Connection lost: ${message}`);
    console.error(`[bridge] Attempting reconnect (${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})...`);
    attemptReconnect();
    return;
  }

  // Fatal error - shut down
  shuttingDown = true;
  console.error(`[bridge] Fatal error: ${message}`);

  Promise.allSettled([
    stdio ? stdio.close() : Promise.resolve(),
    sse ? sse.close() : Promise.resolve()
  ]).finally(() => {
    process.exit(1);
  });
};

const attemptReconnect = async () => {
  if (reconnecting || shuttingDown) {
    return;
  }

  reconnecting = true;
  reconnectAttempts++;
  sseReady = false;

  // Close existing SSE connection
  if (sse) {
    try {
      await sse.close();
    } catch (error) {
      // Ignore close errors
    }
    sse = null;
  }

  // Wait before reconnecting
  await new Promise(resolve => setTimeout(resolve, RECONNECT_DELAY_MS));

  if (shuttingDown) {
    return;
  }

  try {
    // Create new SSE transport
    sse = new SSEClientTransport(endpoint);
    
    // Set up handlers
    sse.onmessage = (message) => {
      if (stdio) {
        stdio.send(message).catch(bail);
      }
    };
    
    sse.onerror = bail;

    // Start the transport
    await sse.start();
    
    sseReady = true;
    reconnecting = false;
    reconnectAttempts = 0;
    
    console.error(`[bridge] Reconnected to ${endpoint.href}`);
    flushPending();
  } catch (error) {
    reconnecting = false;
    console.error(`[bridge] Reconnect failed: ${error.message}`);
    bail(error);
  }
};

stdio.onmessage = (message) => {
  if (!sseReady || reconnecting) {
    pendingOutgoing.push(message);
    return;
  }

  if (sse) {
    sse.send(message).catch(bail);
  }
};

stdio.onerror = bail;

const shutdown = (signal) => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  console.error(`[bridge] Received ${signal}, closing transports...`);

  Promise.allSettled([
    stdio ? stdio.close() : Promise.resolve(),
    sse ? sse.close() : Promise.resolve()
  ]).finally(() => {
    process.exit(0);
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

const startBridge = async () => {
  try {
    // Start stdio transport
    await stdio.start();
    console.error("[bridge] Stdio transport started");

    // Create and start SSE transport
    sse = new SSEClientTransport(endpoint);
    
    sse.onmessage = (message) => {
      if (stdio) {
        stdio.send(message).catch(bail);
      }
    };
    
    sse.onerror = bail;

    await sse.start();
    
    sseReady = true;
    reconnectAttempts = 0;
    
    console.error(`[bridge] Connected to ${endpoint.href}`);
    flushPending();
  } catch (error) {
    console.error(`[bridge] Failed to start: ${error.message}`);
    bail(error);
  }
};

// Start the bridge
startBridge();
