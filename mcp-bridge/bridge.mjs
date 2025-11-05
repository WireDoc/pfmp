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

const stdio = new StdioServerTransport();
const sse = new SSEClientTransport(endpoint);

let shuttingDown = false;
let sseReady = false;
const pendingOutgoing = [];

const flushPending = () => {
  if (!sseReady) {
    return;
  }

  while (pendingOutgoing.length > 0) {
    const message = pendingOutgoing.shift();
    sse.send(message).catch(bail);
  }
};

const bail = (error) => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  const message =
    error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(`[bridge] Fatal error: ${message}`);

  Promise.allSettled([stdio.close(), sse.close()]).finally(() => {
    process.exit(1);
  });
};

stdio.onmessage = (message) => {
  if (!sseReady) {
    pendingOutgoing.push(message);
    return;
  }

  sse.send(message).catch(bail);
};

sse.onmessage = (message) => {
  stdio.send(message).catch(bail);
};

stdio.onerror = bail;
sse.onerror = bail;

const shutdown = (signal) => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  console.error(`[bridge] Received ${signal}, closing transports...`);

  Promise.allSettled([stdio.close(), sse.close()]).finally(() => {
    process.exit(0);
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

const stdioStartPromise = stdio.start().catch(bail);
const sseStartPromise = sse
  .start()
  .then(() => {
    sseReady = true;
    flushPending();
  })
  .catch(bail);

Promise.all([stdioStartPromise, sseStartPromise])
  .then(() => {
    console.error(`[bridge] Connected to ${endpoint.href}`);
  })
  .catch(() => {
    /* handled via bail */
  });
