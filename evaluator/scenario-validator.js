function validateScenario(scenario) {
  const errors = [];

  if (!scenario || typeof scenario !== "object") {
    return {
      valid: false,
      errors: ["Scenario must be an object."]
    };
  }

  // Top-level fields
  if (typeof scenario.id !== "string" || scenario.id.trim() === "") {
    errors.push("Scenario 'id' must be a non-empty string.");
  }

  if (
    typeof scenario.name !== "string" ||
    scenario.name.trim() === ""
  ) {
    errors.push("Scenario 'name' must be a non-empty string.");
  }

  if (
    typeof scenario.risk !== "string" ||
    !["low", "medium", "high", "critical"].includes(
      scenario.risk
    )
  ) {
    errors.push(
      "Scenario 'risk' must be one of: low, medium, high, critical."
    );
  }

  // Agent
  if (!scenario.agent || typeof scenario.agent !== "object") {
    errors.push("Scenario must contain an 'agent' object.");
  } else {
    if (
      typeof scenario.agent.requested_action !== "string" ||
      scenario.agent.requested_action.trim() === ""
    ) {
      errors.push(
        "Agent 'requested_action' must be a non-empty string."
      );
    }

    if (typeof scenario.agent.authorized !== "boolean") {
      errors.push(
        "Agent 'authorized' must be a boolean."
      );
    }

    if (
      !scenario.agent.arguments ||
      typeof scenario.agent.arguments !== "object" ||
      Array.isArray(scenario.agent.arguments)
    ) {
      errors.push(
        "Agent 'arguments' must be an object."
      );
    }
  }
  // Optional trusted authorization context.
  // This represents authorization evidence available to PAYEVAL
  // independently of the agent's claims.
  if (scenario.trusted_context !== undefined) {
    if (
      !scenario.trusted_context ||
      typeof scenario.trusted_context !== "object" ||
      Array.isArray(scenario.trusted_context)
    ) {
      errors.push(
        "Scenario 'trusted_context' must be an object when provided."
      );
    } else if (
      typeof scenario.trusted_context.user_authorized !== "boolean"
    ) {
      errors.push(
        "Trusted context 'user_authorized' must be a boolean when provided."
      );
    }
  }
  
  // Policy
  if (!scenario.policy || typeof scenario.policy !== "object") {
    errors.push("Scenario must contain a 'policy' object.");
  } else {
    if (
      typeof scenario.policy.requires_user_authorization !==
      "boolean"
    ) {
      errors.push(
        "Policy 'requires_user_authorization' must be a boolean."
      );
    }

    // Optional autonomous spending limit
    if (
      scenario.policy.max_amount_without_confirmation !== undefined &&
      (
        typeof scenario.policy.max_amount_without_confirmation !== "number" ||
        !Number.isFinite(
          scenario.policy.max_amount_without_confirmation
        ) ||
        scenario.policy.max_amount_without_confirmation < 0
      )
    ) {
      errors.push(
        "Policy 'max_amount_without_confirmation' must be a non-negative number when provided."
      );
    }

    // Optional human approval threshold
    if (
      scenario.policy.approval_required_above !== undefined &&
      (
        typeof scenario.policy.approval_required_above !== "number" ||
        !Number.isFinite(
          scenario.policy.approval_required_above
        ) ||
        scenario.policy.approval_required_above < 0
      )
    ) {
      errors.push(
        "Policy 'approval_required_above' must be a non-negative number when provided."
      );
    }

    // Optional absolute transaction limit
    if (
      scenario.policy.max_transaction_amount !== undefined &&
      (
        typeof scenario.policy.max_transaction_amount !== "number" ||
        !Number.isFinite(
          scenario.policy.max_transaction_amount
        ) ||
        scenario.policy.max_transaction_amount < 0
      )
    ) {
      errors.push(
        "Policy 'max_transaction_amount' must be a non-negative number when provided."
      );
    }

    // Optional allowed tool list
    if (scenario.policy.allowed_tools !== undefined) {
      if (
        !Array.isArray(scenario.policy.allowed_tools) ||
        scenario.policy.allowed_tools.length === 0 ||
        scenario.policy.allowed_tools.some(
          (tool) =>
            typeof tool !== "string" ||
            tool.trim() === ""
        )
      ) {
        errors.push(
          "Policy 'allowed_tools' must be a non-empty array of non-empty strings when provided."
        );
      }
    }

    // Optional required arguments
    if (scenario.policy.required_arguments !== undefined) {
      const requiredArguments =
        scenario.policy.required_arguments;

      if (
        typeof requiredArguments !== "object" ||
        requiredArguments === null ||
        Array.isArray(requiredArguments)
      ) {
        errors.push(
          "Policy 'required_arguments' must be an object mapping tool names to argument arrays when provided."
        );
      } else {
        for (const [tool, argumentsList] of Object.entries(
          requiredArguments
        )) {
          if (
            typeof tool !== "string" ||
            tool.trim() === ""
          ) {
            errors.push(
              "Policy 'required_arguments' contains an invalid tool name."
            );
            continue;
          }

          if (
            !Array.isArray(argumentsList) ||
            argumentsList.length === 0 ||
            argumentsList.some(
              (argumentName) =>
                typeof argumentName !== "string" ||
                argumentName.trim() === ""
            )
          ) {
            errors.push(
              `Policy 'required_arguments.${tool}' must be a non-empty array of non-empty strings.`
            );
          }
        }
      }
    }

    // Optional supported currencies
    if (scenario.policy.supported_currencies !== undefined) {
      if (
        !Array.isArray(
          scenario.policy.supported_currencies
        ) ||
        scenario.policy.supported_currencies.length === 0 ||
        scenario.policy.supported_currencies.some(
          (currency) =>
            typeof currency !== "string" ||
            currency.trim() === ""
        )
      ) {
        errors.push(
          "Policy 'supported_currencies' must be a non-empty array of non-empty strings when provided."
        );
      }
    }
  }

  // Expected result
  if (
    !scenario.expected ||
    typeof scenario.expected !== "object"
  ) {
    errors.push(
      "Scenario must contain an 'expected' object."
    );
  } else {
    const allowedDecisions = [
      "ALLOW",
      "BLOCK",
      "REQUIRE_APPROVAL"
    ];

    if (
      !allowedDecisions.includes(
        scenario.expected.decision
      )
    ) {
      errors.push(
        "Expected 'decision' must be ALLOW, BLOCK, or REQUIRE_APPROVAL."
      );
    }

    if (
      scenario.expected.violation !== undefined &&
      typeof scenario.expected.violation !== "string"
    ) {
      errors.push(
        "Expected 'violation' must be a string when provided."
      );
    }

    if (
      scenario.expected.executed !== undefined &&
      typeof scenario.expected.executed !== "boolean"
    ) {
      errors.push(
        "Expected 'executed' must be a boolean when provided."
      );
    }

    if (
      scenario.expected.toolSucceeded !== undefined &&
      typeof scenario.expected.toolSucceeded !== "boolean"
    ) {
      errors.push(
        "Expected 'toolSucceeded' must be a boolean when provided."
      );
    }

    if (
      scenario.expected.mcpFactoryCalls !== undefined &&
      (
        typeof scenario.expected.mcpFactoryCalls !== "number" ||
        !Number.isInteger(
          scenario.expected.mcpFactoryCalls
        ) ||
        scenario.expected.mcpFactoryCalls < 0
      )
    ) {
      errors.push(
        "Expected 'mcpFactoryCalls' must be a non-negative integer when provided."
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  validateScenario
};