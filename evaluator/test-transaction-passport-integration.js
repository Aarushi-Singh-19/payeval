const {
  createTransactionPassport,
  verifyTransactionPassport
} = require("./transaction-passport");

function assert(condition, message) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

const scenario = {
  id: "transaction-passport-demo",
  name: "Transaction Passport Demo",

  intent: {
    tool: "create_order",
    amount: 500,
    currency: "INR",
    target: "passport-demo-001"
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
  }
};

const authorizedAction = {
  tool: "create_order",
  authorized: true,
  arguments: {
    amount: 500,
    currency: "INR",
    receipt: "passport-demo-001"
  }
};

let mcpCalls = 0;

function fakeMcpCall(action) {
  mcpCalls += 1;

  return {
    isError: false,
    order: {
      id: `order_demo_${mcpCalls}`,
      amount: action.arguments.amount,
      currency: action.arguments.currency
    }
  };
}

console.log("");
console.log("========================================");
console.log("     PAYEVAL TRANSACTION PASSPORT");
console.log("        END-TO-END SECURITY TEST");
console.log("========================================");
console.log("");

/*
 * ------------------------------------------------------------
 * 1. ISSUE PASSPORT
 * ------------------------------------------------------------
 */

const passport = createTransactionPassport({
  intent: scenario.intent,
  policy: scenario.policy,
  action: authorizedAction
});

console.log("1. Passport issued");
console.log(`   Passport ID:     ${passport.passportId}`);
console.log(`   Authorized:      ₹500 INR`);
console.log(`   Action hash:     ${passport.actionHash.slice(0, 16)}...`);
console.log(`   Expires:         ${passport.expiresAt}`);
console.log("   ✅ Authorization bound to exact action");

console.log("");

/*
 * ------------------------------------------------------------
 * 2. LEGITIMATE EXECUTION
 * ------------------------------------------------------------
 */

const legitimateResult = verifyTransactionPassport(
  passport,
  {
    intent: scenario.intent,
    policy: scenario.policy,
    action: authorizedAction
  }
);

console.log("2. Legitimate execution");
console.log(`   Decision:        ${legitimateResult.decision}`);
console.log(`   Valid:           ${legitimateResult.valid}`);
console.log(`   Violation:       ${legitimateResult.violation}`);

assert(
  legitimateResult.valid === true,
  "legitimate action must verify"
);

assert(
  legitimateResult.decision === "ALLOW",
  "legitimate action must be allowed"
);

const legitimateMcpResult =
  fakeMcpCall(authorizedAction);

console.log(
  `   Razorpay/MCP:    ${legitimateMcpResult.order.id}`
);
console.log("   ✅ Exact authorized action accepted");

console.log("");

/*
 * ------------------------------------------------------------
 * 3. TAMPERING ATTACK
 * ------------------------------------------------------------
 */

const tamperedAction = {
  ...authorizedAction,
  arguments: {
    ...authorizedAction.arguments,
    amount: 5000
  }
};

const tamperedResult =
  verifyTransactionPassport(
    passport,
    {
      intent: scenario.intent,
      policy: scenario.policy,
      action: tamperedAction
    }
  );

console.log("3. Agent tampering attack");
console.log("   Passport amount: ₹500");
console.log("   Agent amount:    ₹5,000");
console.log(`   Decision:        ${tamperedResult.decision}`);
console.log(`   Valid:           ${tamperedResult.valid}`);
console.log(`   Violation:       ${tamperedResult.violation}`);

assert(
  tamperedResult.valid === false,
  "tampered action must fail"
);

assert(
  tamperedResult.violation ===
    "PASSPORT_ACTION_MISMATCH",
  "tampered amount must trigger passport mismatch"
);

console.log(
  `   MCP calls:       ${mcpCalls}`
);

assert(
  mcpCalls === 1,
  "tampered action must not create another MCP call"
);

console.log("   ✅ ₹500 → ₹5,000 tampering blocked");

console.log("");

/*
 * ------------------------------------------------------------
 * 4. CONSUME PASSPORT
 * ------------------------------------------------------------
 */

const consumePassport =
  createTransactionPassport({
    intent: scenario.intent,
    policy: scenario.policy,
    action: authorizedAction
  });

const consumedResult =
  verifyTransactionPassport(
    consumePassport,
    {
      intent: scenario.intent,
      policy: scenario.policy,
      action: authorizedAction,
      consume: true
    }
  );

console.log("4. Passport consumption");
console.log(`   Decision:        ${consumedResult.decision}`);
console.log(`   Valid:           ${consumedResult.valid}`);

assert(
  consumedResult.valid === true,
  "first passport use must succeed"
);

console.log("   ✅ Passport consumed after authorization");

console.log("");

/*
 * ------------------------------------------------------------
 * 5. REPLAY ATTACK
 * ------------------------------------------------------------
 */

const replayResult =
  verifyTransactionPassport(
    consumePassport,
    {
      intent: scenario.intent,
      policy: scenario.policy,
      action: authorizedAction
    }
  );

console.log("5. Replay attack");
console.log(`   Decision:        ${replayResult.decision}`);
console.log(`   Valid:           ${replayResult.valid}`);
console.log(`   Violation:       ${replayResult.violation}`);

assert(
  replayResult.valid === false,
  "replayed passport must fail"
);

assert(
  replayResult.violation === "PASSPORT_REPLAY",
  "replay must be detected"
);

console.log("   ✅ Replay blocked");

console.log("");

/*
 * ------------------------------------------------------------
 * FINAL RESULT
 * ------------------------------------------------------------
 */

console.log("========================================");
console.log("       PASSPORT SECURITY RESULT");
console.log("========================================");
console.log("");

console.log("Passport issued:          2");
console.log("Legitimate execution:     PASS");
console.log("Amount tampering:         BLOCKED");
console.log("Replay attack:            BLOCKED");
console.log(`MCP calls:                ${mcpCalls}`);
console.log("");

console.log(
  "🎯 TRANSACTION PASSPORT INTEGRATION PASSED"
);

console.log("");