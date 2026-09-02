const { enforceAction } = require("./enforcement-gateway");

(async () => {
const {
  createTransactionPassport
} = require("./transaction-passport");

function assert(condition, message) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

const scenario = {
  id: "passport-gateway-demo",

  intent: {
    tool: "create_order",
    amount: 500,
    currency: "INR",
    target: "gateway-demo-001"
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
    receipt: "gateway-demo-001"
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
          id: `order_gateway_${mcpCalls}`,
          tool: name,
          amount: args.amount,
          currency: args.currency
        }
      };
    }
  };
}

console.log("");
console.log("========================================");
console.log("   TRANSACTION PASSPORT GATEWAY TEST");
console.log("========================================");
console.log("");

/*
 * 1. Issue Passport for the exact authorized action.
 */
const passport = createTransactionPassport({
  intent: scenario.intent,
  policy: scenario.policy,
  action: authorizedAction
});

console.log("1. Passport issued");
console.log(`   ID:       ${passport.passportId}`);
console.log("   Amount:   ₹500");
console.log("   Currency: INR");
console.log("   ✅ Passport created");

/*
 * 2. Execute exact authorized action.
 */
const legitimateResult = await enforceAction(
  scenario,
  authorizedAction,
  fakeMcpClient,
  null,
  passport
);

console.log("");
console.log("2. Legitimate execution");
console.log(`   Decision:  ${legitimateResult.decision}`);
console.log(`   Execution: ${legitimateResult.executionStatus}`);
console.log(`   Executed:  ${legitimateResult.executed}`);
console.log(`   MCP calls: ${mcpCalls}`);

assert(
  legitimateResult.decision === "ALLOW",
  "legitimate action must be allowed"
);

assert(
  legitimateResult.executed === true,
  "legitimate action must execute"
);

assert(
  mcpCalls === 1,
  "legitimate action must make exactly one MCP call"
);

assert(
  passport.consumed === true,
  "successful execution must consume the passport"
);

console.log("   ✅ Authorized action executed and Passport consumed");

/*
 * 3. Attempt replay using the SAME Passport.
 */
const replayResult = await enforceAction(
  scenario,
  authorizedAction,
  fakeMcpClient,
  null,
  passport
);

console.log("");
console.log("3. Replay attack");
console.log(`   Decision:   ${replayResult.decision}`);
console.log(`   Violation:  ${replayResult.violation}`);
console.log(`   Executed:   ${replayResult.executed}`);
console.log(`   MCP calls:  ${mcpCalls}`);

assert(
  replayResult.decision === "BLOCK",
  "replayed passport must be blocked"
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
  mcpCalls === 1,
  "replay must not create another MCP call"
);

console.log("   ✅ Replay blocked before MCP");

/*
 * 4. Issue a fresh Passport for ₹500,
 *    then tamper the final action to ₹5,000.
 */
const tamperPassport = createTransactionPassport({
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

const tamperResult = await enforceAction(
  scenario,
  tamperedAction,
  fakeMcpClient,
  null,
  tamperPassport
);

console.log("");
console.log("4. Amount tampering");
console.log("   Authorized: ₹500");
console.log("   Agent:      ₹5,000");
console.log(`   Decision:   ${tamperResult.decision}`);
console.log(`   Violation:  ${tamperResult.violation}`);
console.log(`   Executed:   ${tamperResult.executed}`);
console.log(`   MCP calls:  ${mcpCalls}`);

assert(
  tamperResult.decision === "BLOCK",
  "tampered amount must be blocked"
);

assert(
  tamperResult.violation === "INTENT_AMOUNT_EXCEEDED" ||
  tamperResult.violation === "PASSPORT_ACTION_MISMATCH",
  "tampered amount must trigger a security violation"
);

assert(
  tamperResult.executed === false,
  "tampered action must not execute"
);

assert(
  mcpCalls === 1,
  "tampered action must not create another MCP call"
);

console.log("   ✅ ₹500 → ₹5,000 tampering blocked before MCP");

console.log("");
console.log("========================================");
console.log("          GATEWAY RESULT");
console.log("========================================");
console.log("");
console.log("Legitimate execution: PASS");
console.log("Passport consumed:    PASS");
console.log("Replay attack:        BLOCKED");
console.log("Amount tampering:     BLOCKED");
console.log(`Total MCP calls:      ${mcpCalls}`);
console.log("");
console.log("🎯 TRANSACTION PASSPORT GATEWAY PASSED");
console.log("");

})();
