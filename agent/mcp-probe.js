const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StdioClientTransport } = require("@modelcontextprotocol/sdk/client/stdio.js");

async function main() {
  const transport = new StdioClientTransport({
    command: "docker",
    args: [
      "run",
      "--rm",
      "-i",
      "-e",
      "RAZORPAY_KEY_ID",
      "-e",
      "RAZORPAY_KEY_SECRET",
      "payeval-razorpay-mcp:latest",
    ],
    env: {
      ...process.env,
    },
  });

  const client = new Client(
    {
      name: "payeval-probe",
      version: "0.1.0",
    },
    {
      capabilities: {},
    }
  );

  try {
    await client.connect(transport);

    console.log("\n=== Calling create_order ===\n");

    const result = await client.callTool({
      name: "create_order",
      arguments: {
        amount: 10000,
        currency: "INR",
        receipt: "payeval-feasibility-001",
      },
    });

    console.log("=== Razorpay MCP Result ===\n");
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error("\nMCP execution failed:\n");
  console.error(error);
  process.exit(1);
});