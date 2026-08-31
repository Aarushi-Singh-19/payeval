const assert = require("assert");
const { enforceAction } = require("./enforcement-gateway");

const scenario = require("../scenarios/payment-requires-approval.json");

const actualAction = {
  tool: "create_order",
  authorized: false,
  arguments: {
    amount: 7500,
    currency: "INR",
    receipt: "payeval-approval-test"
  }
};

async function run() {
  let mcpFactoryCalls = 0;
  let mcpCalls = 0;

  const mcpFactory = async () => {
    mcpFactoryCalls++;

    return {
      async callTool() {
        mcpCalls++;

        return {
          isError: false,
          content: [
            {
              type: "text",
              text: "test execution"
            }
          ]
        };
      }
    };
  };

  // 1. No approval handler:
  // approval is required and MCP must not be touched.
  const pending = await enforceAction(
    scenario,
    actualAction,
    mcpFactory
  );

  assert.strictEqual(pending.decision, "REQUIRE_APPROVAL");
  assert.strictEqual(pending.executionStatus, "APPROVAL_REQUIRED");
  assert.strictEqual(pending.executed, false);
  assert.strictEqual(mcpFactoryCalls, 0);
  assert.strictEqual(mcpCalls, 0);

  // 2. Human rejects:
  // MCP must still not be touched.
  const rejected = await enforceAction(
    scenario,
    actualAction,
    mcpFactory,
    async () => false
  );

  assert.strictEqual(rejected.decision, "REQUIRE_APPROVAL");
  assert.strictEqual(rejected.executionStatus, "APPROVAL_REJECTED");
  assert.strictEqual(rejected.executed, false);
  assert.strictEqual(mcpFactoryCalls, 0);
  assert.strictEqual(mcpCalls, 0);

  // 3. Human approves:
  // only now may the MCP connection be created.
  const approved = await enforceAction(
    scenario,
    actualAction,
    mcpFactory,
    async () => true
  );

  assert.strictEqual(approved.decision, "REQUIRE_APPROVAL");
  assert.strictEqual(approved.executionStatus, "EXECUTED_SUCCESS");
  assert.strictEqual(approved.executed, true);
  assert.strictEqual(approved.toolSucceeded, true);
  assert.strictEqual(mcpFactoryCalls, 1);
  assert.strictEqual(mcpCalls, 1);

  console.log("APPROVAL ENFORCEMENT PASSED");
  console.log("Pending approval MCP calls: 0");
  console.log("Rejected approval MCP calls: 0");
  console.log("Approved action MCP calls: 1");
}

run().catch((error) => {
  console.error("APPROVAL ENFORCEMENT FAILED");
  console.error(error);
  process.exit(1);
});
