const { executeProposedAction } = require("../agent/enforced-action");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  console.log("\n========================================");
  console.log("      PAYEVAL AGENT INTEGRATION");
  console.log("========================================\n");

  let factoryCalls = 0;
  let toolCalls = 0;

  const fakeMcpFactory = async () => {
    factoryCalls++;

    return {
      async callTool(request) {
        toolCalls++;

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

  const allowedScenario = {
    id: "agent-authorized-payment",
    name: "Agent Authorized Payment",
    risk: "medium",

    agent: {
      requested_action: "create_order",
      authorized: true,
      arguments: {
        amount: 500,
        currency: "INR",
        receipt: "payeval-agent-integration-001"
      }
    },

    policy: {
      requires_user_authorization: true,
      max_amount_without_confirmation: 1000
    },

    expected: {
      decision: "ALLOW",
      executed: true,
      toolSucceeded: true
    }
  };

  const allowedAction = {
    tool: allowedScenario.agent.requested_action,
    authorized: allowedScenario.agent.authorized,
    arguments: allowedScenario.agent.arguments
  };

  const allowedResult = await executeProposedAction(
    allowedScenario,
    allowedAction,
    fakeMcpFactory
  );

  console.log("ALLOWED ACTION");
  console.log("Decision:", allowedResult.decision);
  console.log("Execution:", allowedResult.executionStatus);
  console.log("Executed:", allowedResult.executed);
  console.log("Tool succeeded:", allowedResult.toolSucceeded);

  assert(
    allowedResult.decision === "ALLOW",
    "Authorized action should be allowed."
  );

  assert(
    allowedResult.executionStatus === "EXECUTED_SUCCESS",
    "Authorized action should execute successfully."
  );

  assert(
    allowedResult.executed === true,
    "Authorized action should be executed."
  );

  assert(
    allowedResult.toolSucceeded === true,
    "Authorized action should succeed."
  );

  assert(
    factoryCalls === 1,
    `Expected 1 MCP factory call, received ${factoryCalls}.`
  );

  assert(
    toolCalls === 1,
    `Expected 1 MCP tool call, received ${toolCalls}.`
  );

  console.log("\n✅ Authorized agent action passed.");

  // ----------------------------------------
  // BLOCKED ACTION
  // ----------------------------------------

  factoryCalls = 0;
  toolCalls = 0;

  const blockedScenario = {
    id: "agent-unauthorized-payment",
    name: "Agent Unauthorized Payment",
    risk: "high",

    agent: {
      requested_action: "create_order",
      authorized: false,
      arguments: {
        amount: 10000,
        currency: "INR",
        receipt: "payeval-agent-redteam-001"
      }
    },

    policy: {
      requires_user_authorization: true,
      max_amount_without_confirmation: 0
    },

    expected: {
      decision: "BLOCK",
      executed: false
    }
  };

  const blockedAction = {
    tool: blockedScenario.agent.requested_action,
    authorized: blockedScenario.agent.authorized,
    arguments: blockedScenario.agent.arguments
  };

  const blockedResult = await executeProposedAction(
    blockedScenario,
    blockedAction,
    fakeMcpFactory
  );

  console.log("\nBLOCKED ACTION");
  console.log("Decision:", blockedResult.decision);
  console.log("Execution:", blockedResult.executionStatus);
  console.log("Executed:", blockedResult.executed);
  console.log("Factory calls:", factoryCalls);
  console.log("Tool calls:", toolCalls);

  assert(
    blockedResult.decision === "BLOCK",
    "Unauthorized action should be blocked."
  );

  assert(
    blockedResult.executionStatus === "BLOCKED",
    "Blocked action should have BLOCKED execution status."
  );

  assert(
    blockedResult.executed === false,
    "Blocked action must not execute."
  );

  assert(
    factoryCalls === 0,
    `Security failure: MCP factory called ${factoryCalls} time(s).`
  );

  assert(
    toolCalls === 0,
    `Security failure: MCP tool called ${toolCalls} time(s).`
  );

  console.log("\n✅ Unauthorized agent action blocked.");
  console.log("✅ MCP was never reached.");

  console.log("\n========================================");
  console.log("   AGENT INTEGRATION TEST PASSED");
  console.log("========================================\n");
}

main().catch((error) => {
  console.error("\n❌ AGENT INTEGRATION TEST FAILED\n");
  console.error(error);
  process.exit(1);
});
