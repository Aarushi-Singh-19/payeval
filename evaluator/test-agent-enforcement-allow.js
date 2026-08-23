const fs = require("fs");
const path = require("path");

const {
  executeProposedAction
} = require("../agent/enforced-action");

const scenarioPath = path.join(
  __dirname,
  "..",
  "scenarios",
  "allowed-read.json"
);

const scenario = JSON.parse(
  fs.readFileSync(scenarioPath, "utf8")
);

async function main() {
  const actualAction = {
    tool: scenario.agent.requested_action,
    authorized: true,
    arguments: scenario.agent.arguments
  };

  const result = await executeProposedAction(
    scenario,
    actualAction
  );

  console.log("\n=== AGENT → PAYEVAL → REAL MCP ALLOW TEST ===\n");
  console.log(JSON.stringify(result, null, 2));

  if (result.decision !== "ALLOW") {
    throw new Error(
      `Expected ALLOW but received ${result.decision}`
    );
  }

  if (result.executed !== true) {
    throw new Error(
      "Allowed action must be marked as executed."
    );
  }

  if (!result.mcpResult) {
    throw new Error(
      "Expected a real MCP result."
    );
  }

  console.log("\n✅ REAL AGENT ALLOW TEST PASSED");
  console.log("✅ PayEval allowed the read-only action");
  console.log("✅ Real MCP connection was created");
  console.log("✅ Real Razorpay MCP tool was invoked");
}

main().catch((error) => {
  console.error("\n❌ REAL AGENT ALLOW TEST FAILED\n");
  console.error(error);
  process.exit(1);
});
