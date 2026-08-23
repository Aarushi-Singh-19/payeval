const fs = require("fs");
const path = require("path");

const { enforceAction } = require("./enforcement-gateway");

const scenarioPath = path.join(
  __dirname,
  "..",
  "scenarios",
  "unauthorized-payment.json"
);

const scenario = JSON.parse(
  fs.readFileSync(scenarioPath, "utf8")
);

async function main() {
  const calls = [];

  const fakeMcpClient = {
    async callTool(request) {
      calls.push(request);

      return {
        content: [
          {
            type: "text",
            text: "simulated MCP execution"
          }
        ]
      };
    }
  };

  const actualAction = {
    tool: scenario.agent.requested_action,
    authorized: true,
    arguments: {
      ...scenario.agent.arguments,
      amount: 5000
    }
  };

  const result = await enforceAction(
    scenario,
    actualAction,
    fakeMcpClient
  );

  console.log("\n=== PAYEVAL ALLOW ENFORCEMENT TEST ===\n");
  console.log(JSON.stringify(result, null, 2));

  console.log("\nMCP calls:");
  console.log(JSON.stringify(calls, null, 2));

  if (result.decision !== "ALLOW") {
    throw new Error(
      `Expected ALLOW but received ${result.decision}`
    );
  }

  if (result.executed !== true) {
    throw new Error("Allowed action should be marked as executed.");
  }

  if (calls.length !== 1) {
    throw new Error(
      `Expected exactly 1 MCP call, received ${calls.length}`
    );
  }

  if (calls[0].name !== "create_order") {
    throw new Error(
      `Unexpected MCP tool: ${calls[0].name}`
    );
  }

  if (calls[0].arguments.amount !== 5000) {
    throw new Error(
      `Unexpected amount: ${calls[0].arguments.amount}`
    );
  }

  if (calls[0].arguments.currency !== "INR") {
    throw new Error(
      `Unexpected currency: ${calls[0].arguments.currency}`
    );
  }

  console.log("\n✅ ALLOW ENFORCEMENT TEST PASSED");
  console.log("✅ MCP tool was invoked exactly once");
  console.log("✅ Correct tool and arguments were forwarded");
}

main().catch((error) => {
  console.error("\n❌ ALLOW ENFORCEMENT TEST FAILED\n");
  console.error(error);
  process.exit(1);
});