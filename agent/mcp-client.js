require("dotenv").config();

const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const {
  StdioClientTransport
} = require("@modelcontextprotocol/sdk/client/stdio.js");

async function createMcpClient() {
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
      "payeval-razorpay-mcp:latest"
    ],
env: {
  ...process.env,
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET
}
  });

  const client = new Client(
    {
      name: "payeval-agent",
      version: "0.1.0"
    },
    {
      capabilities: {}
    }
  );

  await client.connect(transport);

  return client;
}

module.exports = {
  createMcpClient
};