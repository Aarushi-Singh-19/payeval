const fs = require("fs");
const path = require("path");

const {
  executeProposedAction
} = require("../agent/enforced-action");

const scenarioPath = path.join(
  __dirname,
  "..",
  "scenarios",
  "payment-requires-approval.json"
);

const scenario = JSON.parse(
  fs.readFileSync(scenarioPath, "utf8")
);

async function runTest() {
  console.log("\n========================================");
  console.log("       PAYEVAL APPROVAL TEST");
  console.log("========================================\n");

  let mcpFactoryCalls = 0;
  let mcpToolCalls = 0;

  const fakeMcpClientFactory = async () => {
    mcpFactoryCalls++;

    return {
      async callTool(request) {
        mcpToolCalls++;

        console.log("\n=== MCP INVOCATION ===");
        console.log(JSON.stringify(request, null, 2));

        return {
          isError: false,
          content: [
            {
              type: "text",
              text: JSON.stringify({
                simulated: true,
                tool: request.name,
                arguments: request.arguments
              })
            }
          ]
        };
      },

      async close() {}
    };
  };

  const actualAction = {
    tool: scenario.agent.requested_action,
    authorized: scenario.agent.authorized === true,
    arguments: scenario.agent.arguments
  };

  // ----------------------------------------
  // TEST 1: Approval rejected
  // ----------------------------------------

  console.log("TEST 1: APPROVAL REJECTED");

  mcpFactoryCalls = 0;
  mcpToolCalls = 0;

  const rejectedResult = await executeProposedAction(
    scenario,
    actualAction,
    fakeMcpClientFactory,
    async () => {
      console.log("Approval requested → REJECTED");
      return false;
    }
  );

  console.log("\nDecision:", rejectedResult.decision);
  console.log(
    "Execution status:",
    rejectedResult.executionStatus
  );
  console.log("Executed:", rejectedResult.executed);
  console.log("MCP factory calls:", mcpFactoryCalls);
  console.log("MCP tool calls:", mcpToolCalls);

  if (rejectedResult.decision !== "REQUIRE_APPROVAL") {
    throw new Error(
      `Expected REQUIRE_APPROVAL, received ${rejectedResult.decision}`
    );
  }

  if (
    rejectedResult.executionStatus !==
    "APPROVAL_REJECTED"
  ) {
    throw new Error(
      `Expected APPROVAL_REJECTED, received ${rejectedResult.executionStatus}`
    );
  }

  if (rejectedResult.executed !== false) {
    throw new Error(
      "Rejected approval must not execute."
    );
  }

  if (mcpFactoryCalls !== 0) {
    throw new Error(
      `Rejected approval reached MCP factory: ${mcpFactoryCalls}`
    );
  }

  if (mcpToolCalls !== 0) {
    throw new Error(
      `Rejected approval reached MCP tool: ${mcpToolCalls}`
    );
  }

  console.log("✓ Rejected approval prevented execution.");
  console.log("✓ MCP factory was never created.");
  console.log("✓ MCP tool was never called.");

  // ----------------------------------------
  // TEST 2: Approval accepted
  // ----------------------------------------

  console.log("\nTEST 2: APPROVAL ACCEPTED");

  mcpFactoryCalls = 0;
  mcpToolCalls = 0;

  const approvedResult = await executeProposedAction(
    scenario,
    actualAction,
    fakeMcpClientFactory,
    async () => {
      console.log("Approval requested → APPROVED");
      return true;
    }
  );

  console.log("\nDecision:", approvedResult.decision);
  console.log(
    "Execution status:",
    approvedResult.executionStatus
  );
  console.log("Executed:", approvedResult.executed);
  console.log(
    "Tool succeeded:",
    approvedResult.toolSucceeded
  );
  console.log("MCP factory calls:", mcpFactoryCalls);
  console.log("MCP tool calls:", mcpToolCalls);

  if (approvedResult.decision !== "REQUIRE_APPROVAL") {
    throw new Error(
      `Expected REQUIRE_APPROVAL before approval, received ${approvedResult.decision}`
    );
  }

  if (
    approvedResult.executionStatus !==
    "EXECUTED_SUCCESS"
  ) {
    throw new Error(
      `Expected EXECUTED_SUCCESS, received ${approvedResult.executionStatus}`
    );
  }

  if (approvedResult.executed !== true) {
    throw new Error(
      "Approved action was not executed."
    );
  }

  if (approvedResult.toolSucceeded !== true) {
    throw new Error(
      "Approved MCP tool did not succeed."
    );
  }

  if (mcpFactoryCalls !== 1) {
    throw new Error(
      `Expected 1 MCP factory call, received ${mcpFactoryCalls}`
    );
  }

  if (mcpToolCalls !== 1) {
    throw new Error(
      `Expected 1 MCP tool call, received ${mcpToolCalls}`
    );
  }

  console.log("✓ Approved action reached MCP.");
  console.log("✓ MCP tool executed successfully.");

  console.log("\n========================================");
  console.log("        APPROVAL TEST PASSED");
  console.log("========================================\n");

  console.log(
    "Security boundary verified:"
  );

  console.log(
    "REQUIRE_APPROVAL → REJECT → MCP = 0"
  );

  console.log(
    "REQUIRE_APPROVAL → APPROVE → MCP = 1"
  );
}

runTest().catch((error) => {
  console.error("\n========================================");
  console.error("        APPROVAL TEST FAILED");
  console.error("========================================\n");

  console.error(error);

  process.exit(1);
});