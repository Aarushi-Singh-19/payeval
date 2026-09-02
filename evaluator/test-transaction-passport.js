const {
  createTransactionPassport,
  verifyTransactionPassport
} = require("./transaction-passport");

function assert(condition, message) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

const intent = {
  tool: "create_order",
  amount: 500,
  currency: "INR",
  target: "subscription-001"
};

const policy = {
  requires_user_authorization: true,
  max_amount_without_confirmation: 1000,
  max_transaction_amount: 10000,
  supported_currencies: ["INR"]
};

const legitimateAction = {
  tool: "create_order",
  authorized: true,
  arguments: {
    amount: 500,
    currency: "INR",
    receipt: "subscription-001"
  }
};

console.log("");
console.log("========================================");
console.log("       PAYEVAL TRANSACTION PASSPORT");
console.log("========================================");
console.log("");

const passport = createTransactionPassport({
  intent,
  policy,
  action: legitimateAction
});

console.log("Passport:");
console.log(`  ID:             ${passport.passportId}`);
console.log(`  Intent hash:    ${passport.intentHash.slice(0, 16)}...`);
console.log(`  Policy hash:    ${passport.policyHash.slice(0, 16)}...`);
console.log(`  Action hash:    ${passport.actionHash.slice(0, 16)}...`);
console.log(`  Expires:        ${passport.expiresAt}`);

console.log("");

const validResult = verifyTransactionPassport(
  passport,
  {
    intent,
    policy,
    action: legitimateAction,
    consume: true
  }
);

console.log("1. Legitimate transaction");
console.log(`   Decision:       ${validResult.decision}`);
console.log(`   Valid:          ${validResult.valid}`);
console.log(`   Violation:      ${validResult.violation}`);
console.log(`   Passport:       ${validResult.passportId}`);

assert(validResult.valid === true, "legitimate passport should verify");
assert(validResult.decision === "ALLOW", "legitimate action should be allowed");

console.log("   ✅ Passport verified");

console.log("");

const replayResult = verifyTransactionPassport(
  passport,
  {
    intent,
    policy,
    action: legitimateAction
  }
);

console.log("2. Replay attempt");
console.log(`   Decision:       ${replayResult.decision}`);
console.log(`   Valid:          ${replayResult.valid}`);
console.log(`   Violation:      ${replayResult.violation}`);

assert(replayResult.valid === false, "replay should fail");
assert(
  replayResult.violation === "PASSPORT_REPLAY",
  "replay should be detected"
);

console.log("   ✅ Replay blocked");

console.log("");

const freshPassport = createTransactionPassport({
  intent,
  policy,
  action: legitimateAction
});

const modifiedAction = {
  ...legitimateAction,
  arguments: {
    ...legitimateAction.arguments,
    amount: 5000
  }
};

const tamperedResult = verifyTransactionPassport(
  freshPassport,
  {
    intent,
    policy,
    action: modifiedAction
  }
);

console.log("3. Amount tampering");
console.log("   Authorized amount: ₹500");
console.log("   Actual amount:     ₹5,000");
console.log(`   Decision:           ${tamperedResult.decision}`);
console.log(`   Valid:              ${tamperedResult.valid}`);
console.log(`   Violation:          ${tamperedResult.violation}`);

assert(tamperedResult.valid === false, "tampered action should fail");
assert(
  tamperedResult.violation === "PASSPORT_ACTION_MISMATCH",
  "tampered action should be detected"
);

console.log("   ✅ Amount tampering blocked");

console.log("");

const changedPolicy = {
  ...policy,
  max_amount_without_confirmation: 5000
};

const policyResult = verifyTransactionPassport(
  freshPassport,
  {
    intent,
    policy: changedPolicy,
    action: legitimateAction
  }
);

console.log("4. Policy tampering");
console.log(`   Decision:       ${policyResult.decision}`);
console.log(`   Valid:          ${policyResult.valid}`);
console.log(`   Violation:      ${policyResult.violation}`);

assert(policyResult.valid === false, "policy mismatch should fail");
assert(
  policyResult.violation === "PASSPORT_POLICY_MISMATCH",
  "policy mismatch should be detected"
);

console.log("   ✅ Policy mismatch blocked");

console.log("");

const expiredPassport = createTransactionPassport({
  intent,
  policy,
  action: legitimateAction,
  ttlMs: 1
});

const expiredResult = verifyTransactionPassport(
  expiredPassport,
  {
    intent,
    policy,
    action: legitimateAction,
    now: new Date(
      Date.now() + 10
    )
  }
);

console.log("5. Expired passport");
console.log(`   Decision:       ${expiredResult.decision}`);
console.log(`   Valid:          ${expiredResult.valid}`);
console.log(`   Violation:      ${expiredResult.violation}`);

assert(expiredResult.valid === false, "expired passport should fail");
assert(
  expiredResult.violation === "PASSPORT_EXPIRED",
  "expired passport should be detected"
);

console.log("   ✅ Expired passport blocked");

console.log("");
console.log("========================================");
console.log("        PASSPORT SECURITY RESULT");
console.log("========================================");
console.log("");
console.log("Legitimate transactions:  1");
console.log("Replay attacks blocked:   1");
console.log("Tampering blocked:        2");
console.log("Expired authorization:    1");
console.log("Security escapes:         0");
console.log("");
console.log("🎯 TRANSACTION PASSPORT TEST PASSED");
console.log("");