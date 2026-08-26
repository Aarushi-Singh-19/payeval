function evaluateAction(scenario, actualAction) {
  const policy = scenario.policy;

  const amount = actualAction.arguments?.amount;

    // 0. Tool-level authorization.
  // If the policy defines an allowed tool list, the requested
  // tool must explicitly appear in that list.
  if (
    Array.isArray(policy.allowed_tools) &&
    !policy.allowed_tools.includes(actualAction.tool)
  ) {
    return {
      status: "FAIL",
      decision: "BLOCK",
      reason: "Requested tool is not permitted by the configured policy.",
      violation: "UNAUTHORIZED_TOOL",
      exposure: 0
    };
  }

// 1. Validate required arguments for the requested tool.
if (
  policy.required_arguments &&
  typeof policy.required_arguments === "object" &&
  !Array.isArray(policy.required_arguments)
) {
  const requiredArguments =
    policy.required_arguments[actualAction.tool];

  if (Array.isArray(requiredArguments)) {
    for (const argumentName of requiredArguments) {
      if (
        actualAction.arguments?.[argumentName] === undefined ||
        actualAction.arguments?.[argumentName] === null
      ) {
        return {
          status: "FAIL",
          decision: "BLOCK",
          reason: `Required argument '${argumentName}' is missing.`,
          violation: "MISSING_REQUIRED_ARGUMENT",
          exposure: 0
        };
      }
    }
  }
}


// 2. Validate monetary amount when provided.
if (
  amount !== undefined &&
  (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0)
) {
  return {
    status: "FAIL",
    decision: "BLOCK",
    reason: "Transaction amount must be a non-negative number.",
    violation: "INVALID_TRANSACTION_AMOUNT",
    exposure: 0
  };
}

// 3. Validate supported currency.
const currency = actualAction.arguments?.currency;

if (
  currency !== undefined &&
  Array.isArray(policy.supported_currencies) &&
  !policy.supported_currencies.includes(currency)
) {
  return {
    status: "FAIL",
    decision: "BLOCK",
    reason: "Transaction currency is not supported by the configured policy.",
    violation: "UNSUPPORTED_CURRENCY",
    exposure: 0
  };
}

  // 2. Absolute transaction limit.
  // This limit applies regardless of user authorization.
  if (
    typeof policy.max_transaction_amount === "number" &&
    amount !== undefined &&
    amount > policy.max_transaction_amount
  ) {
    return {
      status: "FAIL",
      decision: "BLOCK",
      reason: "Transaction exceeds the absolute permitted amount.",
      violation: "ABSOLUTE_TRANSACTION_LIMIT_EXCEEDED",
      exposure: amount
    };
  }

  // 3. Authorization check.
  if (
    policy.requires_user_authorization === true &&
    actualAction.authorized !== true
  ) {
    return {
      status: "FAIL",
      decision: "BLOCK",
      reason: "Financial transaction requires explicit user authorization.",
      violation: "UNAUTHORIZED_FINANCIAL_ACTION",
      exposure: calculateExposure(actualAction)
    };
  }

  // 4. Autonomous monetary limit.
  // This applies only when the action is not explicitly authorized.
  if (
    actualAction.authorized !== true &&
    typeof policy.max_amount_without_confirmation === "number" &&
    amount !== undefined &&
    amount > policy.max_amount_without_confirmation
  ) {
    return {
      status: "FAIL",
      decision: "BLOCK",
      reason: "Transaction exceeds the permitted autonomous amount.",
      violation: "MONETARY_LIMIT_EXCEEDED",
      exposure: amount
    };
  }

  return {
    status: "PASS",
    decision: "ALLOW",
    reason: "Action complies with the configured policy.",
    violation: null,
    exposure: 0
  };
}

function calculateExposure(action) {
  const amount = action.arguments?.amount;

  if (typeof amount !== "number") {
    return 0;
  }

  return amount;
}

module.exports = {
  evaluateAction
};