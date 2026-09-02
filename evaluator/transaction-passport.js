const crypto = require("crypto");

const PASSPORT_VERSION = "1.0";
const DEFAULT_TTL_MS = 5 * 60 * 1000;

function canonicalize(value) {
  if (value === null || value === undefined) {
    return "null";
  }

  if (typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }

  return `{${Object.keys(value)
    .sort()
    .map(
      (key) =>
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

function createTransactionPassport({
  intent,
  policy,
  action,
  ttlMs = DEFAULT_TTL_MS
}) {
  if (!intent || !policy || !action) {
    throw new Error(
      "Intent, policy and action are required to create a transaction passport."
    );
  }

  const issuedAt = new Date();
  const expiresAt = new Date(
    issuedAt.getTime() + ttlMs
  );

  const intentHash = sha256(intent);
  const policyHash = sha256(policy);
  const actionHash = sha256(action);

  const passportPayload = {
    version: PASSPORT_VERSION,
    intentHash,
    policyHash,
    actionHash,
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString()
  };

  const passportId = `pp_${sha256(passportPayload).slice(0, 24)}`;

  return {
    passportId,
    version: PASSPORT_VERSION,
    intentHash,
    policyHash,
    actionHash,
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    consumed: false
  };
}

function verifyTransactionPassport(
  passport,
  {
    intent,
    policy,
    action,
    consume = false,
    now = new Date()
  }
) {
  if (!passport) {
    return {
      valid: false,
      decision: "BLOCK",
      reason: "Transaction passport is missing.",
      violation: "PASSPORT_MISSING"
    };
  }

  if (passport.consumed) {
    return {
      valid: false,
      decision: "BLOCK",
      reason: "Transaction passport has already been consumed.",
      violation: "PASSPORT_REPLAY"
    };
  }

  const currentTime = new Date(now);
  const expiresAt = new Date(passport.expiresAt);

  if (
    !Number.isFinite(expiresAt.getTime()) ||
    currentTime > expiresAt
  ) {
    return {
      valid: false,
      decision: "BLOCK",
      reason: "Transaction passport has expired.",
      violation: "PASSPORT_EXPIRED"
    };
  }

  const expectedIntentHash = sha256(intent);
  const expectedPolicyHash = sha256(policy);
  const expectedActionHash = sha256(action);

  if (passport.intentHash !== expectedIntentHash) {
    return {
      valid: false,
      decision: "BLOCK",
      reason: "User intent no longer matches the authorized passport.",
      violation: "PASSPORT_INTENT_MISMATCH"
    };
  }

  if (passport.policyHash !== expectedPolicyHash) {
    return {
      valid: false,
      decision: "BLOCK",
      reason: "Active policy no longer matches the authorized passport.",
      violation: "PASSPORT_POLICY_MISMATCH"
    };
  }

  if (passport.actionHash !== expectedActionHash) {
    return {
      valid: false,
      decision: "BLOCK",
      reason: "Final action does not match the authorized transaction.",
      violation: "PASSPORT_ACTION_MISMATCH"
    };
  }

  if (consume) {
    passport.consumed = true;
  }

  return {
    valid: true,
    decision: "ALLOW",
    reason: "Transaction passport verified successfully.",
    violation: null,
    passportId: passport.passportId
  };
}

module.exports = {
  canonicalize,
  sha256,
  createTransactionPassport,
  verifyTransactionPassport
};