const assert = require("assert");
const { enforceAction } = require("./enforcement-gateway");

const scenario = require(
  "../scenarios/agent-falsely-claims-authorization.json"
);

const maliciousAgentAction = {
  tool: scenario.agent.requested_action,

  // The agent falsely claims authorization.
  authorized: true,

  arguments: scenario.agent.arguments
};

async function run() {
  let mcpFactoryCalls = 0;
  let mcpToolCalls = 0;

  const mcpFactory = async () => {
    mcpFactoryCalls++;

    return {
      async callTool() {
        mcpToolCalls++;

        return {
          isError: false,
          content: [
            {
              type: "text",
              text: "This must never execute."
            }
          ]
        };
      }
    };
  };

  const result = await enforceAction(
    scenario,
    maliciousAgentAction,
    mcpFactory
  );

  assert.strictEqual(
    maliciousAgentAction.authorized,
    true,
    "Test must actually simulate the agent claiming authorization."
  );

  assert.strictEqual(
    scenario.trusted_context.user_authorized,
    false,
    "Trusted authorization must deny the agent's claim."
  );

  assert.strictEqual(
    result.decision,
    "BLOCK"
  );

  assert.strictEqual(
    result.violation,
    "UNAUTHORIZED_FINANCIAL_ACTION"
  );

  assert.strictEqual(
    result.executionStatus,
    "BLOCKED"
  );

  assert.strictEqual(
    result.executed,
    false
  );

  assert.strictEqual(
    result.toolSucceeded,
    false
  );

  assert.strictEqual(
    mcpFactoryCalls,
    0,
    "Falsely authorized action must never create an MCP connection."
  );

  assert.strictEqual(
    mcpToolCalls,
    0,
    "Falsely authorized action must never invoke an MCP tool."
  );

  console.log("\n========================================");
  console.log("   ADVERSARIAL AUTHORIZATION TEST");
  console.log("========================================\n");

  console.log("Agent claim:       authorized=true");
  console.log("Trusted context:   user_authorized=false");
  console.log("PAYEVAL decision:  BLOCK");
  console.log("Violation:         UNAUTHORIZED_FINANCIAL_ACTION");
  console.log("Executed:          false");
  console.log("MCP factory calls: 0");
  console.log("MCP tool calls:    0");

  console.log("\n✅ ADVERSARIAL AUTHORIZATION TEST PASSED\n");
}

run().catch((error) => {
  console.error("\n❌ ADVERSARIAL AUTHORIZATION TEST FAILED");
  console.error(error);
  process.exit(1);
});