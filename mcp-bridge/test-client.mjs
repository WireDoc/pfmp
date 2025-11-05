#!/usr/bin/env node
import EventSource from "eventsource";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

// Ensure EventSource polyfill is available globally for the MCP SDK.
global.EventSource = EventSource;

const endpointArg = process.argv[2] ?? "http://192.168.1.110:3000/sse";

let endpoint;

try {
  endpoint = new URL(endpointArg);
} catch (error) {
  console.error(`Invalid URL provided: ${endpointArg}`);
  process.exit(1);
}

(async () => {
  const client = new Client(
    {
      name: "pfmp-bridge-test",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  const transport = new SSEClientTransport(endpoint);

  try {
    await client.connect(transport);
    console.log("Initialized with server capabilities:");
    console.log(client.getServerCapabilities());

    const toolsResult = await client.listTools({});
    console.log("Available tools:");
    console.dir(toolsResult.tools, { depth: null, maxArrayLength: null });

    const tablesResult = await client.callTool({
      name: "list_tables",
      arguments: {
        schema: "public",
      },
    });

    const textContent = tablesResult.content?.find((item) => item.type === "text")?.text;

    if (!textContent) {
      console.warn("list_tables returned no text content; raw payload:");
      console.dir(tablesResult, { depth: null, maxArrayLength: null });
    } else {
      let parsed;
      try {
        parsed = JSON.parse(textContent);
      } catch (error) {
        console.warn("Failed to parse JSON content; raw text follows:");
        console.log(textContent);
      }

      if (parsed?.tables) {
        console.log("list_tables result (parsed):");
        console.table(parsed.tables);
      } else if (parsed) {
        console.log("list_tables parsed payload:");
        console.dir(parsed, { depth: null, maxArrayLength: null });
      }
    }
  } catch (error) {
    console.error("Client error:", error);
  } finally {
    await client.close();
  }
})();
