const fs = require("fs");
const path = require("path");

const {
  executeProposedAction
} = require("../agent/enforced-action");

function loadScenario(name) {
  const scenarioPath = path.join(
    __dirname,
    "..",
    "scenarios",
    `${name}.json`
  );

  return JSON.parse(
    fs.readFileSync(scenarioPath, "utf8")
  );
}

async function main() {
  console.log("\n========================================");
  console.log("   PAYEVAL AGENT → ENFORCEMENT TEST");
  console.log("========================================\n");

  // --------------------------------------------------
  // 1. Agent proposes an unauthorized payment
  // --------------------------------------------------

  const blockedScenario = loadScenario(
    "unauthorized-payment"
  );

  const blockedAction = {
    tool: blockedScenario.agent.requested_action,
    authorized: false,
    arguments: blockedScenario.agent.arguments
  };

  let blockedFactoryCalls = 0;

  const blockedMcpFactory = async () => {
    blockedFactoryCalls++;

    throw new Error(
      "SECURITY FAILURE: blocked agent action reached MCP."
    );
  };

  const blockedResult = await executeProposedAction(
    blockedScenario,
    blockedAction,
    blockedMcpFactory
  );

  console.log("AGENT PROPOSAL #1");
  console.log("Tool:", blockedAction.tool);
  console.log("Decision:", blockedResult.decision);
  console.log("Execution:", blockedResult.executionStatus);
  console.log("Executed:", blockedResult.executed);
  console.log("MCP factory calls:", blockedFactoryCalls);

  if (blockedResult.decision !== "BLOCK") {
    throw new Error(
      `Expected BLOCK, received ${blockedResult.decision}`
    );
  }

  if (blockedResult.executed !== false) {
    throw new Error(
      "Blocked agent action was marked as executed."
    );
  }

  if (blockedFactoryCalls !== 0) {
    throw new Error(
      "SECURITY FAILURE: MCP was reached by blocked action."
    );
  }

  console.log("✅ Unauthorized agent action blocked.");
  console.log("✅ MCP was never reached.\n");

  // --------------------------------------------------
  // 2. Agent proposes an authorized read
  // --------------------------------------------------

  const allowedScenario = loadScenario(
    "allowed-read"
  );

  const allowedAction = {
    tool: allowedScenario.agent.requested_action,
    authorized: true,
    arguments: allowedScenario.agent.arguments
  };

  let allowedFactoryCalls = 0;
  let allowedToolCalls = 0;

  const allowedMcpFactory = async () => {
    allowedFactoryCalls++;

    return {
      async callTool(request) {
        allowedToolCalls++;

        return {
          isError: false,
          content: [
            {
              type: "text",
              text: JSON.stringify({
                simulated: true,
                tool: request.name
              })
            }
          ]
        };
      },

      async close() {}
    };
  };

  const allowedResult = await executeProposedAction(
    allowedScenario,
    allowedAction,
    allowedMcpFactory
  );

  console.log("AGENT PROPOSAL #2");
  console.log("Tool:", allowedAction.tool);
  console.log("Decision:", allowedResult.decision);
  console.log("Execution:", allowedResult.executionStatus);
  console.log("Executed:", allowedResult.executed);
  console.log("MCP factory calls:", allowedFactoryCalls);
  console.log("MCP tool calls:", allowedToolCalls);

  if (allowedResult.decision !== "ALLOW") {
    throw new Error(
      `Expected ALLOW, received ${allowedResult.decision}`
    );
  }

  if (allowedResult.executed !== true) {
    throw new Error(
      "Allowed agent action was not executed."
    );
  }

  if (allowedResult.toolSucceeded !== true) {
    throw new Error(
      "Allowed MCP tool did not succeed."
    );
  }

  if (allowedFactoryCalls !== 1) {
    throw new Error(
      `Expected 1 MCP factory call, received ${allowedFactoryCalls}`
    );
  }

  if (allowedToolCalls !== 1) {
    throw new Error(
      `Expected 1 MCP tool call, received ${allowedToolCalls}`
    );
  }

  console.log("✅ Authorized agent action passed PAYEVAL.");
  console.log("✅ MCP was reached only after ALLOW.\n");

  // --------------------------------------------------
  // Final result
  // --------------------------------------------------

  console.log("========================================");
  console.log("   AGENT ENFORCEMENT TEST PASSED");
  console.log("========================================");

  console.log("\nSecurity boundary verified:");
  console.log("Agent → PAYEVAL → Policy → MCP");
  console.log("\n❌ Agent cannot bypass PAYEVAL.");
  console.log("✅ BLOCK prevents MCP access.");
  console.log("✅ ALLOW permits MCP execution.");
}

main().catch((error) => {
  console.error(
    "\n❌ AGENT ENFORCEMENT TEST FAILED\n"
  );

  console.error(error);
  process.exit(1);
});