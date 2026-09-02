const { enforceAction } = require("./enforcement-gateway");
const {
  createTransactionPassport
} = require("./transaction-passport");

function assert(condition, message) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

(async () => {
  const scenario = {
    id: "passport-tamper-demo",

    /*
     * Deliberately keep intent independent of amount.
     * The Passport will bind the exact ₹500 action.
     */
    intent: {
      tool: "create_order",
      currency: "INR",
      target: "passport-tamper-001"
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
      receipt: "passport-tamper-001"
    }
  };

  let mcpCalls = 0;

  function fakeMcpClient() {
    return {
      async callTool() {
        mcpCalls += 1;

        return {
          isError: false,
          order: {
            id: `order_passport_${mcpCalls}`
          }
        };
      }
    };
  }

  console.log("");
  console.log("========================================");
  console.log("   PASSPORT ACTION TAMPERING TEST");
  console.log("========================================");
  console.log("");

  /*
   * Issue authorization specifically for ₹500.
   */
  const passport = createTransactionPassport({
    intent: scenario.intent,
    policy: scenario.policy,
    action: authorizedAction
  });

  console.log("1. Authorization issued");
  console.log(`   Passport: ${passport.passportId}`);
  console.log("   Authorized amount: ₹500");
  console.log("   Action hash bound: YES");

  /*
   * Tamper only the final executable amount.
   */
  const tamperedAction = {
    ...authorizedAction,
    arguments: {
      ...authorizedAction.arguments,
      amount: 5000
    }
  };

  console.log("");
  console.log("2. Agent modifies final action");
  console.log("   Passport authorization: ₹500");
  console.log("   Final agent action:      ₹5,000");

  const result = await enforceAction(
    scenario,
    tamperedAction,
    fakeMcpClient,
    null,
    passport
  );

  console.log("");
  console.log("3. PAYEVAL decision");
  console.log(`   Decision:   ${result.decision}`);
  console.log(`   Violation:  ${result.violation}`);
  console.log(`   Executed:   ${result.executed}`);
  console.log(`   MCP calls:  ${mcpCalls}`);

  assert(
    result.decision === "BLOCK",
    "tampered action must be blocked"
  );

  assert(
    result.violation === "PASSPORT_ACTION_MISMATCH",
    `expected PASSPORT_ACTION_MISMATCH, got ${result.violation}`
  );

  assert(
    result.executed === false,
    "tampered action must not execute"
  );

  assert(
    mcpCalls === 0,
    "tampered action must never reach MCP"
  );

  console.log("");
  console.log("========================================");
  console.log("          PASSPORT RESULT");
  console.log("========================================");
  console.log("");
  console.log("₹500 → ₹5,000 tampering: BLOCKED");
  console.log("Passport mismatch:        DETECTED");
  console.log("MCP leakage:              0");
  console.log("");
  console.log("🎯 PASSPORT ACTION TAMPERING PASSED");
  console.log("");
})();
