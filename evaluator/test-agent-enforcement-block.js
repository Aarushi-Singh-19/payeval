const fs = require("fs");
const path = require("path");

const {
  executeProposedAction
} = require("../agent/enforced-action");

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
  let mcpFactoryCalls = 0;

  const fakeMcpClientFactory = async () => {
    mcpFactoryCalls++;

    return {
      async callTool() {
        throw new Error(
          "Security failure: blocked action reached MCP."
        );
      },

      async close() {}
    };
  };

  const actualAction = {
    tool: scenario.agent.requested_action,
    authorized: false,
    arguments: scenario.agent.arguments
  };

  const result = await executeProposedAction(
    scenario,
    actualAction,
    fakeMcpClientFactory
  );

  console.log("\n=== AGENT → PAYEVAL → MCP BLOCK TEST ===\n");
  console.log(JSON.stringify(result, null, 2));
  console.log("\nMCP factory calls:", mcpFactoryCalls);

  if (result.decision !== "BLOCK") {
    throw new Error(
      `Expected BLOCK but received ${result.decision}`
    );
  }

  if (result.executed !== false) {
    throw new Error(
      "Blocked action must not be marked as executed."
    );
  }

  if (mcpFactoryCalls !== 0) {
    throw new Error(
      `Security failure: MCP client factory was called ${mcpFactoryCalls} time(s).`
    );
  }

  console.log("\n✅ AGENT ENFORCEMENT BLOCK TEST PASSED");
  console.log("✅ PayEval blocked the action");
  console.log("✅ MCP connection was never created");
}

main().catch((error) => {
  console.error("\n❌ AGENT ENFORCEMENT TEST FAILED\n");
  console.error(error);
  process.exit(1);
});