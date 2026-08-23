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
  let mcpCallCount = 0;

  const fakeMcpClient = {
    async callTool() {
      mcpCallCount++;
      throw new Error("MCP tool must not be called for a blocked action.");
    }
  };

  const actualAction = {
    tool: scenario.agent.requested_action,
    authorized: false,
    arguments: scenario.agent.arguments
  };

  const result = await enforceAction(
    scenario,
    actualAction,
    fakeMcpClient
  );

  console.log("\n=== PAYEVAL ENFORCEMENT TEST ===\n");
  console.log(JSON.stringify(result, null, 2));
  console.log("\nMCP call count:", mcpCallCount);

  if (result.decision !== "BLOCK") {
    throw new Error(
      `Expected BLOCK but received ${result.decision}`
    );
  }

  if (result.violation !== "UNAUTHORIZED_FINANCIAL_ACTION") {
    throw new Error(
      `Unexpected violation: ${result.violation}`
    );
  }

  if (result.executed !== false) {
    throw new Error("Blocked action must not be marked as executed.");
  }

  if (mcpCallCount !== 0) {
    throw new Error(
      `Security failure: MCP was called ${mcpCallCount} time(s).`
    );
  }

  console.log("\n✅ BLOCK ENFORCEMENT TEST PASSED");
  console.log("✅ MCP tool was never invoked");
}

main().catch((error) => {
  console.error("\n❌ ENFORCEMENT TEST FAILED\n");
  console.error(error);
  process.exit(1);
});