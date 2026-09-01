const FINANCIAL_TOOLS = new Set([
  "create_order",
  "refund_payment",
  "capture_payment"
]);

const DESTRUCTIVE_TOOLS = new Set([
  "delete_customer",
  "delete_order"
]);

function normalizeIntent(intent) {
  if (!intent || typeof intent !== "object") {
    throw new Error("Intent must be an object.");
  }

  return {
    tool: typeof intent.tool === "string" ? intent.tool : null,
    amount:
      typeof intent.amount === "number" && Number.isFinite(intent.amount)
        ? intent.amount
        : null,
    currency:
      typeof intent.currency === "string"
        ? intent.currency.toUpperCase()
        : null,
    target:
      typeof intent.target === "string"
        ? intent.target
        : null
  };
}

function classifyRisk(tool) {
  if (DESTRUCTIVE_TOOLS.has(tool)) {
    return "CRITICAL";
  }

  if (FINANCIAL_TOOLS.has(tool)) {
    return "HIGH";
  }

  if (
    typeof tool === "string" &&
    (tool.startsWith("fetch_") ||
      tool.startsWith("get_") ||
      tool.startsWith("list_"))
  ) {
    return "LOW";
  }

  return "MEDIUM";
}

function evaluateIntent(intent, actualAction) {
  const expected = normalizeIntent(intent);

  if (!actualAction || typeof actualAction.tool !== "string") {
    return {
      decision: "BLOCK",
      reason: "Agent did not provide a valid tool.",
      violation: "INTENT_ACTION_DRIFT",
      risk: "CRITICAL"
    };
  }

  if (expected.tool && actualAction.tool !== expected.tool) {
    return {
      decision: "BLOCK",
      reason: "Agent proposed a tool different from the user's intended action.",
      violation: "INTENT_TOOL_MISMATCH",
      risk: classifyRisk(actualAction.tool)
    };
  }

  const args = actualAction.arguments || {};

  if (
    expected.amount !== null &&
    (
      typeof args.amount !== "number" ||
      args.amount > expected.amount
    )
  ) {
    return {
      decision: "BLOCK",
      reason: "Agent proposed an amount greater than the user's intended amount.",
      violation: "INTENT_AMOUNT_EXCEEDED",
      risk: "HIGH",
      expectedAmount: expected.amount,
      actualAmount: args.amount ?? null
    };
  }

  if (
    expected.currency &&
    typeof args.currency === "string" &&
    args.currency.toUpperCase() !== expected.currency
  ) {
    return {
      decision: "BLOCK",
      reason: "Agent proposed a currency different from the user's intended currency.",
      violation: "INTENT_CURRENCY_MISMATCH",
      risk: classifyRisk(actualAction.tool)
    };
  }

  if (
    expected.target &&
    args.receipt &&
    args.receipt !== expected.target
  ) {
    return {
      decision: "BLOCK",
      reason: "Agent targeted a different resource than the user intended.",
      violation: "INTENT_TARGET_MISMATCH",
      risk: classifyRisk(actualAction.tool)
    };
  }

  return {
    decision: "ALLOW",
    reason: "Agent action is consistent with the declared user intent.",
    violation: null,
    risk: classifyRisk(actualAction.tool)
  };
}

module.exports = {
  evaluateIntent,
  classifyRisk
};
