const crypto = require("crypto");

const LINEAGE_VERSION = "1.0";

function canonicalize(value) {
  if (value === null || value === undefined) return "null";

  if (typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }

  return `{${Object.keys(value)
    .sort()
    .map(
      key =>
        `${JSON.stringify(key)}:${canonicalize(value[key])}`
    )
    .join(",")}}`;
}

function sha256(value) {
  return crypto
    .createHash("sha256")
    .update(canonicalize(value))
    .digest("hex");
}

function createActionLineage({
  intent,
  policy,
  action,
  passport = null
}) {
  if (!intent) throw new Error("Intent is required.");
  if (!policy) throw new Error("Policy is required.");
  if (!action) throw new Error("Action is required.");

  const lineageId = `lin_${crypto.randomBytes(12).toString("hex")}`;

  return {
    lineageId,
    version: LINEAGE_VERSION,

    createdAt: new Date().toISOString(),

    intent: {
      snapshot: intent,
      hash: sha256(intent)
    },

    policy: {
      snapshot: policy,
      hash: sha256(policy)
    },

    action: {
      snapshot: action,
      hash: sha256(action)
    },

    passport: passport
      ? {
          passportId: passport.passportId,
          intentHash: passport.intentHash,
          policyHash: passport.policyHash,
          actionHash: passport.actionHash,
          issuedAt: passport.issuedAt,
          expiresAt: passport.expiresAt,
          consumed: passport.consumed === true
        }
      : null,

    decision: null,

    execution: {
      attempted: false,
      executed: false,
      externalCalls: 0,
      toolSucceeded: false,
      status: "NOT_ATTEMPTED",
      externalReference: null
    },

    security: {
      blocked: false,
      violation: null,
      reason: null
    },

    events: []
  };
}

function attachPassport(lineage, passport) {
  lineage.passport = passport
    ? {
        passportId: passport.passportId,
        intentHash: passport.intentHash,
        policyHash: passport.policyHash,
        actionHash: passport.actionHash,
        issuedAt: passport.issuedAt,
        expiresAt: passport.expiresAt,
        consumed: passport.consumed === true
      }
    : null;

  return lineage;
}

function addLineageEvent(lineage, type, details = {}) {
  if (!lineage || !Array.isArray(lineage.events)) {
    throw new Error("Valid lineage is required.");
  }

  lineage.events.push({
    timestamp: new Date().toISOString(),
    type,
    ...details
  });

  return lineage;
}

function recordDecision(lineage, {
  decision,
  violation = null,
  reason = null
}) {
  lineage.decision = decision;

  lineage.security.blocked = decision === "BLOCK";
  lineage.security.violation = violation;
  lineage.security.reason = reason;

  addLineageEvent(lineage, "POLICY_DECISION", {
    decision,
    violation,
    reason
  });

  return lineage;
}

function recordExecution(lineage, {
  attempted = true,
  executed = false,
  externalCalls = 0,
  toolSucceeded = false,
  status = "NOT_ATTEMPTED",
  externalReference = null
} = {}) {
  lineage.execution = {
    attempted,
    executed,
    externalCalls,
    toolSucceeded,
    status,
    externalReference
  };

  addLineageEvent(lineage, "EXECUTION_RESULT", {
    executed,
    externalCalls,
    toolSucceeded,
    status,
    externalReference
  });

  return lineage;
}

function recordSecurityEvent(lineage, type, details = {}) {
  addLineageEvent(lineage, type, details);
  return lineage;
}

function summarizeLineage(lineage) {
  return {
    lineageId: lineage.lineageId,
    decision: lineage.decision,

    blocked: lineage.security.blocked,
    violation: lineage.security.violation,

    executed: lineage.execution.executed,
    externalCalls: lineage.execution.externalCalls,

    passportId: lineage.passport?.passportId || null,

    intentHash: lineage.intent.hash,
    policyHash: lineage.policy.hash,
    actionHash: lineage.action.hash,

    executionStatus: lineage.execution.status,

    externalReference: lineage.execution.externalReference,

    eventCount: lineage.events.length
  };
}

module.exports = {
  canonicalize,
  sha256,
  createActionLineage,
  attachPassport,
  addLineageEvent,
  recordDecision,
  recordExecution,
  recordSecurityEvent,
  summarizeLineage
};
