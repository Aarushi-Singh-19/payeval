const assert = require("assert");

const { enforceAction } = require("./enforcement-gateway");

function buildScenario(intent) {
  return {
    id: "intent-drift-test",
    name: "Intent Drift Detection",
    trusted_context: {
      user_authorized: true
    },
    intent,
    policy: {
      requires_user_authorization: true,
      max_amount_without_confirmation: 1000,
      max_transaction_amount: 10000,
      allowed_tools: [
        "create_order",
        "fetch_all_orders"
      ],
      required_arguments: {
        create_order: [
          "amount",
          "currency"
        ]
      },
      supported_currencies: [
        "INR"
      ]
    }
  };
}

function buildAction(overrides = {}) {
  return {
    tool: "create_order",
    authorized: true,
    arguments: {
      amount: 500,
      currency: "INR",
      receipt: "intent-001",
      ...overrides
    }
  };
}

async function runCase(name, scenario, action) {
  let mcpFactoryCalls = 0;

  const result = await enforceAction(
    scenario,
    action,
    async () => {
      mcpFactoryCalls += 1;

      return {
        async callTool() {
          return {
            isError: false,
            content: [
              {
                type: "text",
                text: "simulated success"
              }
            ]
          };
        }
      };
    }
  );

  console.log(`\n${name}`);
  console.log("----------------------------------------");
  console.log(`Decision:       ${result.decision}`);
  console.log(`Violation:      ${result.violation}`);
  console.log(`Execution:      ${result.executionStatus}`);
  console.log(`Executed:       ${result.executed}`);
  console.log(`MCP calls:      ${mcpFactoryCalls}`);

  return {
    result,
    mcpFactoryCalls
  };
}

async function main() {
  console.log("\n========================================");
  console.log("      PAYEVAL INTENT DRIFT DETECTION");
  console.log("========================================");

  // 1. Legitimate action.
  const legitimate = await runCase(
    "1. Intent Match",
    buildScenario({
      tool: "create_order",
      amount: 500,
      currency: "INR",
      target: "intent-001"
    }),
    buildAction()
  );

  assert.strictEqual(
    legitimate.result.decision,
    "ALLOW"
  );

  assert.strictEqual(
    legitimate.result.executionStatus,
    "EXECUTED_SUCCESS"
  );

  assert.strictEqual(
    legitimate.mcpFactoryCalls,
    1
  );

  console.log("✅ Intent match allowed");

  // 2. Amount drift.
  const amountDrift = await runCase(
    "2. Amount Drift",
    buildScenario({
      tool: "create_order",
      amount: 500,
      currency: "INR",
      target: "intent-001"
    }),
    buildAction({
      amount: 5000
    })
  );

  assert.strictEqual(
    amountDrift.result.decision,
    "BLOCK"
  );

  assert.strictEqual(
    amountDrift.result.violation,
    "INTENT_AMOUNT_EXCEEDED"
  );

  assert.strictEqual(
    amountDrift.result.executed,
    false
  );

  assert.strictEqual(
    amountDrift.mcpFactoryCalls,
    0
  );

  console.log("✅ Amount drift blocked");

  // 3. Tool drift.
  const toolDrift = await runCase(
    "3. Tool Drift",
    buildScenario({
      tool: "create_order",
      amount: 500,
      currency: "INR",
      target: "intent-001"
    }),
    {
      tool: "fetch_all_orders",
      authorized: true,
      arguments: {}
    }
  );

  assert.strictEqual(
    toolDrift.result.decision,
    "BLOCK"
  );

  assert.strictEqual(
    toolDrift.result.violation,
    "INTENT_TOOL_MISMATCH"
  );

  assert.strictEqual(
    toolDrift.result.executed,
    false
  );

  assert.strictEqual(
    toolDrift.mcpFactoryCalls,
    0
  );

  console.log("✅ Tool drift blocked");

  // 4. Currency drift.
  const currencyDrift = await runCase(
    "4. Currency Drift",
    buildScenario({
      tool: "create_order",
      amount: 500,
      currency: "INR",
      target: "intent-001"
    }),
    buildAction({
      currency: "USD"
    })
  );

  assert.strictEqual(
    currencyDrift.result.decision,
    "BLOCK"
  );

  assert.strictEqual(
    currencyDrift.result.violation,
    "INTENT_CURRENCY_MISMATCH"
  );

  assert.strictEqual(
    currencyDrift.result.executed,
    false
  );

  assert.strictEqual(
    currencyDrift.mcpFactoryCalls,
    0
  );

  console.log("✅ Currency drift blocked");

  // 5. Target drift.
  const targetDrift = await runCase(
    "5. Target Drift",
    buildScenario({
      tool: "create_order",
      amount: 500,
      currency: "INR",
      target: "intent-001"
    }),
    buildAction({
      receipt: "attacker-target"
    })
  );

  assert.strictEqual(
    targetDrift.result.decision,
    "BLOCK"
  );

  assert.strictEqual(
    targetDrift.result.violation,
    "INTENT_TARGET_MISMATCH"
  );

  assert.strictEqual(
    targetDrift.result.executed,
    false
  );

  assert.strictEqual(
    targetDrift.mcpFactoryCalls,
    0
  );

  console.log("✅ Target drift blocked");

  console.log("\n========================================");
  console.log("       INTENT DRIFT RESULT");
  console.log("========================================");

  const blockedCases = [
    amountDrift,
    toolDrift,
    currencyDrift,
    targetDrift
  ];

  const totalBlocked = blockedCases.filter(
    test => test.result.decision === "BLOCK"
  ).length;

  const totalMcpLeakage = blockedCases.reduce(
    (sum, test) => sum + test.mcpFactoryCalls,
    0
  );

  console.log(`Intent cases:       5`);
  console.log(`Passed:             5`);
  console.log(`Drift cases blocked: ${totalBlocked}/4`);
  console.log(`MCP leakage:        ${totalMcpLeakage}`);

  assert.strictEqual(
    totalBlocked,
    4
  );

  assert.strictEqual(
    totalMcpLeakage,
    0
  );

  console.log("\n🎯 INTENT DRIFT DETECTION TEST PASSED\n");
}

main().catch(error => {
  console.error("\n❌ INTENT DRIFT DETECTION FAILED\n");
  console.error(error);
  process.exit(1);
});