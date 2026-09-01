const crypto = require("crypto");

/**
 * Create a normalized execution trace for a PayEval action.
 *
 * This module is intentionally side-effect free:
 * - it does not invoke MCP
 * - it does not evaluate policy
 * - it does not persist data
 *
 * It only records the outcome that has already been determined.
 */
function createExecutionTrace({
  scenario,
  actualAction,
  evaluation,
  executionStatus,
  executed,
  toolSucceeded,
  mcpResult = null,
  mcpError = null,
  startedAt = new Date().toISOString(),
  completedAt = new Date().toISOString()
}) {
  if (!scenario || typeof scenario.id !== "string") {
    throw new Error("Scenario with a valid id is required.");
  }

  if (!actualAction || typeof actualAction.tool !== "string") {
    throw new Error("Action with a valid tool is required.");
  }

  if (!evaluation || typeof evaluation.decision !== "string") {
    throw new Error("Policy evaluation with a valid decision is required.");
  }

  if (typeof executed !== "boolean") {
    throw new Error("Execution 'executed' value must be boolean.");
  }

  if (typeof toolSucceeded !== "boolean") {
    throw new Error("Execution 'toolSucceeded' value must be boolean.");
  }

  if (typeof executionStatus !== "string") {
    throw new Error("Execution status is required.");
  }

  if (typeof startedAt !== "string") {
    throw new Error("Execution 'startedAt' value must be a string.");
  }

  if (typeof completedAt !== "string") {
    throw new Error("Execution 'completedAt' value must be a string.");
  }

  let normalizedMcpError = null;

  if (mcpError) {
    normalizedMcpError = {
      name:
        typeof mcpError.name === "string"
          ? mcpError.name
          : "Error",

      message:
        typeof mcpError.message === "string"
          ? mcpError.message
          : String(mcpError)
    };
  }

  return {
    runId: crypto.randomUUID(),
    scenarioId: scenario.id,
    timestamp: completedAt,

  action: {
  tool: actualAction.tool,
  authorized: actualAction.authorized === true,
  arguments: actualAction.arguments ?? {}
},

    policy: {
      decision: evaluation.decision,
      reason: evaluation.reason ?? null,
      violation: evaluation.violation ?? null,
      exposure: evaluation.exposure ?? 0,
      risk: evaluation.risk ?? null
    },

    execution: {
      status: executionStatus,
      startedAt,
      completedAt,
      executed,
      toolSucceeded
    },

    mcp:
      mcpResult !== null || normalizedMcpError !== null
        ? {
            tool: actualAction.tool,
            arguments: actualAction.arguments ?? {},
            result: mcpResult,
            error: normalizedMcpError
          }
        : null
  };
}

module.exports = {
  createExecutionTrace
};