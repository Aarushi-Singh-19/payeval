const {
  createActionLineage,
  recordDecision,
  recordExecution,
  recordSecurityEvent,
  summarizeLineage
} = require("./action-lineage");

const intent = {
  tool: "create_order",
  amount: 500,
  currency: "INR",
  target: "payeval-hero-001"
};

const policy = {
  requires_user_authorization: true,
  max_autonomous_amount: 1000,
  absolute_amount_limit: 10000,
  supported_currencies: ["INR"],
  allowed_tools: ["create_order"]
};

const action = {
  tool: "create_order",
  amount: 500,
  currency: "INR",
  target: "payeval-hero-001"
};

const passport = {
  passportId: "pp_test_123",
  intentHash: "intent_hash",
  policyHash: "policy_hash",
  actionHash: "action_hash",
  issuedAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 300000).toISOString(),
  consumed: false
};

console.log("=== PAYEVAL ACTION LINEAGE TEST ===");

const lineage = createActionLineage({
  intent,
  policy,
  action,
  passport
});

if (!lineage.lineageId.startsWith("lin_")) {
  throw new Error("Lineage ID was not created.");
}

if (!lineage.intent.hash) {
  throw new Error("Intent hash missing.");
}

if (!lineage.policy.hash) {
  throw new Error("Policy hash missing.");
}

if (!lineage.action.hash) {
  throw new Error("Action hash missing.");
}

if (lineage.passport?.passportId !== "pp_test_123") {
  throw new Error("Passport was not attached.");
}

recordDecision(lineage, {
  decision: "ALLOW",
  reason: "Authorized payment within policy limits."
});

recordSecurityEvent(lineage, "PASSPORT_VERIFIED", {
  passportId: "pp_test_123"
});

recordExecution(lineage, {
  attempted: true,
  executed: true,
  externalCalls: 1,
  toolSucceeded: true,
  status: "EXECUTED_SUCCESS",
  externalReference: "order_test_123"
});

const summary = summarizeLineage(lineage);

if (summary.decision !== "ALLOW") {
  throw new Error("Decision was not recorded.");
}

if (summary.executed !== true) {
  throw new Error("Execution was not recorded.");
}

if (summary.externalCalls !== 1) {
  throw new Error("External call count incorrect.");
}

if (summary.externalReference !== "order_test_123") {
  throw new Error("External reference missing.");
}

if (summary.eventCount !== 3) {
  throw new Error(`Expected 3 events, got ${summary.eventCount}`);
}

console.log("Lineage ID:", summary.lineageId);
console.log("Decision:", summary.decision);
console.log("Passport:", summary.passportId);
console.log("Execution:", summary.executionStatus);
console.log("External calls:", summary.externalCalls);
console.log("External reference:", summary.externalReference);
console.log("Events:", summary.eventCount);

console.log("🎯 ACTION LINEAGE TEST PASSED");
