const assert = require("assert");
const { enforceAction } = require("./enforcement-gateway");
const {
  createTransactionPassport
} = require("./transaction-passport");

const scenario = {
  id: "action-lineage-gateway-demo",
  intent: {
    tool: "create_order",
    amount: 500,
    currency: "INR",
    target: "cust_demo"
  },
  policy: {
    requires_user_authorization: true,
    max_amount_without_confirmation: 1000,
    max_transaction_amount: 10000,
    supported_currencies: ["INR"],
    allowed_tools: ["create_order"],
    required_arguments: {
      create_order: ["amount", "currency"]
    }
  },  trusted_context: {
    user_authorized: true
  }
};

let mcpCalls = 0;

function fakeMcpClient() {
  return {
    async callTool({ name, arguments: args }) {
      mcpCalls += 1;

      return {
        isError: false,
        order: {
          id: "order_lineage_demo",
          tool: name,
          amount: args.amount,
          currency: args.currency
        }
      };
    }
  };
}

const authorizedAction = {
  tool: "create_order",
  authorized: true,
  arguments: {
    amount: 500,
    currency: "INR",
    receipt: "cust_demo"
  }
};

async function run() {
  console.log("");
  console.log("========================================");
  console.log("   PAYEVAL ACTION LINEAGE GATEWAY TEST");
  console.log("========================================");
  console.log("");

  const passport = createTransactionPassport({
    intent: scenario.intent,
    policy: scenario.policy,
    action: authorizedAction
  });

  const allowed = await enforceAction(
    scenario,
    authorizedAction,
    fakeMcpClient(),
    null,
    passport
  );

  console.log("1. Authorized transaction");
  console.log("----------------------------------------");
  console.log("Decision:       ", allowed.decision);
  console.log("Execution:      ", allowed.executionStatus);
  console.log("Executed:       ", allowed.executed);
  console.log("Passport ID:    ", allowed.lineage?.passport?.passportId);
  console.log("Lineage ID:     ", allowed.lineage?.lineageId);
  console.log("Events:         ", allowed.lineage?.events?.length);
  console.log("External calls: ", allowed.lineage?.execution?.externalCalls);
  console.log("External ref:   ", allowed.lineage?.execution?.externalReference);

  const expectedEvents = [
    "ENFORCEMENT_STARTED",
    "POLICY_DECISION",
    "TRANSACTION_PASSPORT_PRESENTED",
    "TRANSACTION_PASSPORT_VERIFIED",
    "MCP_CONNECTION_ESTABLISHED",
    "EXECUTION_RESULT"
  ];

  const actualEvents =
    allowed.lineage?.events?.map(event => event.type) || [];

  for (const event of expectedEvents) {
    assert(
      actualEvents.includes(event),
      `Missing lineage event: ${event}`
    );
  }

  assert.strictEqual(
    allowed.decision,
    "ALLOW",
    "Authorized transaction was not allowed."
  );

  assert.strictEqual(
    allowed.executed,
    true,
    "Authorized transaction did not execute."
  );

  assert.ok(
    allowed.lineage?.passport?.passportId,
    "Passport was not attached to lineage."
  );

  assert.strictEqual(
    allowed.lineageSummary?.passportId,
    allowed.lineage.passport.passportId,
    "Lineage summary Passport ID mismatch."
  );

  assert.strictEqual(
    allowed.lineage.execution.externalCalls,
    1,
    "Expected exactly 1 external call."
  );

  assert.strictEqual(
    allowed.lineage.execution.externalReference,
    "order_lineage_demo",
    "External reference was not captured."
  );

  assert.strictEqual(
    mcpCalls,
    1,
    "Expected exactly one MCP call."
  );

  console.log("✅ Authorized timeline complete");

  const tamperedAction = {
    ...authorizedAction,
    arguments: {
      ...authorizedAction.arguments,
      amount: 5000
    }
  };

  const blocked = await enforceAction(
    scenario,
    tamperedAction,
    fakeMcpClient(),
    null,
    null
  );

  console.log("");
  console.log("2. Amount tampering");
  console.log("----------------------------------------");
  console.log("Decision:       ", blocked.decision);
  console.log("Violation:      ", blocked.violation);
  console.log("Executed:       ", blocked.executed);
  console.log("Passport ID:    ", blocked.lineage?.passport?.passportId);
  console.log("Events:         ", blocked.lineage?.events?.length);
  console.log("External calls: ", blocked.lineage?.execution?.externalCalls);

  const blockedEvents =
    blocked.lineage?.events?.map(event => event.type) || [];

  assert.strictEqual(
    blocked.decision,
    "BLOCK",
    "Tampered transaction was not blocked."
  );

  assert.strictEqual(
    blocked.executed,
    false,
    "Tampered transaction executed."
  );

  assert.strictEqual(
    blocked.lineage?.execution?.externalCalls,
    0,
    "Blocked transaction reached external execution."
  );

  assert.strictEqual(
    mcpCalls,
    1,
    "Blocked transaction reached MCP."
  );

  assert.ok(
    blockedEvents.includes("POLICY_DECISION"),
    "Blocked timeline missing POLICY_DECISION."
  );

  console.log("✅ Tampering timeline complete");

  console.log("");
  console.log("========================================");
  console.log("          LINEAGE RESULT");
  console.log("========================================");
  console.log("Authorized timeline: PASS");
  console.log("Passport attached:   PASS");
  console.log("Execution recorded:  PASS");
  console.log("External reference:  PASS");
  console.log("Blocked timeline:    PASS");
  console.log("MCP leakage:         0");
  console.log("");
  console.log("🎯 ACTION LINEAGE GATEWAY TEST PASSED");
  console.log("");
}

run().catch(error => {
  console.error("");
  console.error("❌ ACTION LINEAGE GATEWAY TEST FAILED");
  console.error(error.message);
  process.exit(1);
});
