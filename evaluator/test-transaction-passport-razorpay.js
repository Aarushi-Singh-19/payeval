require("dotenv").config();

const { enforceAction } = require("./enforcement-gateway");
const {
  createTransactionPassport
} = require("./transaction-passport");
const {
  executeRazorpayTestAction
} = require("../integrations/razorpay-test-gateway");

function assert(condition, message) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

(async () => {
  const scenario = {
    id: "passport-razorpay-hero",

    intent: {
      tool: "create_order",
      amount: 500,
      currency: "INR",
      target: "payeval-hero-001"
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
      receipt: "payeval-hero-001"
    }
  };

  /*
   * The Passport is issued BEFORE execution and binds
   * the exact authorized ₹500 action.
   */
  const passport = createTransactionPassport({
    intent: scenario.intent,
    policy: scenario.policy,
    action: authorizedAction
  });

  let razorpayCalls = 0;

  function secureRazorpayClient() {
    return {
      async callTool({ name, arguments: args }) {
        razorpayCalls += 1;

        return executeRazorpayTestAction({
          tool: name,
          arguments: args
        });
      }
    };
  }

  console.log("");
  console.log("========================================");
  console.log(" PAYEVAL TRANSACTION PASSPORT + RAZORPAY");
  console.log("             HERO TEST");
  console.log("========================================");
  console.log("");

  console.log("1. USER AUTHORIZATION");
  console.log("   User authorized: ₹500 INR");
  console.log(`   Passport: ${passport.passportId}`);
  console.log("   Action binding: SHA-256");
  console.log("   Mode: Razorpay TEST MODE");
  console.log("   ✅ Authorization issued");

  /*
   * REAL RAZORPAY TEST MODE EXECUTION
   */
  const legitimateResult = await enforceAction(
    scenario,
    authorizedAction,
    secureRazorpayClient,
    null,
    passport
  );

  console.log("");
  console.log("2. LEGITIMATE TRANSACTION");
  console.log(`   Decision:   ${legitimateResult.decision}`);
  console.log(`   Execution:  ${legitimateResult.executionStatus}`);
  console.log(`   Executed:   ${legitimateResult.executed}`);
  console.log(`   Razorpay calls: ${razorpayCalls}`);

  const razorpayOrderId =
    legitimateResult.mcpResult?.order?.id ||
    legitimateResult.mcpResult?.id;

  console.log(`   Razorpay order: ${razorpayOrderId || "UNKNOWN"}`);

  assert(
    legitimateResult.decision === "ALLOW",
    "legitimate transaction must be allowed"
  );

  assert(
    legitimateResult.executed === true,
    "legitimate transaction must execute"
  );

  assert(
    legitimateResult.toolSucceeded === true,
    "Razorpay Test Mode order must succeed"
  );

  assert(
    razorpayCalls === 1,
    "exactly one Razorpay call expected"
  );

  assert(
    typeof razorpayOrderId === "string" &&
    razorpayOrderId.startsWith("order_"),
    "real Razorpay order ID expected"
  );

  assert(
    passport.consumed === true,
    "successful transaction must consume Passport"
  );

  console.log("   ✅ REAL Razorpay Test Mode order created");

  /*
   * NEW PASSPORT FOR THE ATTACK DEMO
   *
   * This prevents the attack from being rejected merely
   * because the original Passport was already consumed.
   */
  const attackPassport = createTransactionPassport({
    intent: scenario.intent,
    policy: scenario.policy,
    action: authorizedAction
  });

  const tamperedAction = {
    ...authorizedAction,
    arguments: {
      ...authorizedAction.arguments,
      amount: 5000
    }
  };

  console.log("");
  console.log("3. AGENT TAMPERING ATTACK");
  console.log("   Authorized amount: ₹500");
  console.log("   Agent changes to:   ₹5,000");

  const tamperedResult = await enforceAction(
    scenario,
    tamperedAction,
    secureRazorpayClient,
    null,
    attackPassport
  );

  console.log(`   Decision:   ${tamperedResult.decision}`);
  console.log(`   Violation:  ${tamperedResult.violation}`);
  console.log(`   Executed:   ${tamperedResult.executed}`);
  console.log(`   Razorpay calls: ${razorpayCalls}`);

  assert(
    tamperedResult.decision === "BLOCK",
    "tampered transaction must be blocked"
  );

  assert(
    tamperedResult.violation === "PASSPORT_ACTION_MISMATCH",
    `expected PASSPORT_ACTION_MISMATCH, got ${tamperedResult.violation}`
  );

  assert(
    tamperedResult.executed === false,
    "tampered transaction must not execute"
  );

  assert(
    razorpayCalls === 1,
    "tampered transaction must not reach Razorpay"
  );

  console.log("   ✅ ₹500 → ₹5,000 tampering blocked");
  console.log("   ✅ NO second Razorpay order created");

  /*
   * REPLAY ATTACK
   */
  console.log("");
  console.log("4. PASSPORT REPLAY ATTACK");

  const replayResult = await enforceAction(
    scenario,
    authorizedAction,
    secureRazorpayClient,
    null,
    passport
  );

  console.log(`   Decision:   ${replayResult.decision}`);
  console.log(`   Violation:  ${replayResult.violation}`);
  console.log(`   Executed:   ${replayResult.executed}`);
  console.log(`   Razorpay calls: ${razorpayCalls}`);

  assert(
    replayResult.decision === "BLOCK",
    "replayed Passport must be blocked"
  );

  assert(
    replayResult.violation === "PASSPORT_REPLAY",
    "replay must trigger PASSPORT_REPLAY"
  );

  assert(
    replayResult.executed === false,
    "replay must not execute"
  );

  assert(
    razorpayCalls === 1,
    "replay must not reach Razorpay"
  );

  console.log("   ✅ Replay blocked");
  console.log("   ✅ NO duplicate Razorpay order");

  console.log("");
  console.log("========================================");
  console.log("          HERO TEST RESULT");
  console.log("========================================");
  console.log("");
  console.log("Real Razorpay Test Order: CREATED");
  console.log("Transaction Passport:      VERIFIED");
  console.log("Passport consumption:      PASS");
  console.log("₹500 → ₹5,000 tampering:  BLOCKED");
  console.log("Passport replay:           BLOCKED");
  console.log(`Razorpay API calls:        ${razorpayCalls}`);
  console.log("Razorpay leakage:          0");
  console.log("");
  console.log("🎯 PAYEVAL HERO INTEGRATION PASSED");
  console.log("");
})();
