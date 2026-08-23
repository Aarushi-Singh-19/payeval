const { evaluateAction } = require("./policy-engine");
const { createExecutionTrace } = require("./execution-trace");

/**
 * Enforce PayEval policy before allowing an MCP tool invocation.
 *
 * Execution outcomes:
 * - BLOCKED: policy prevented execution
 * - EXECUTED_SUCCESS: policy allowed and MCP tool succeeded
 * - EXECUTED_FAILURE: policy allowed but MCP tool reported an error
 * - MCP_CONNECTION_FAILURE: policy allowed but MCP connection could not be established
 *
 * The MCP dependency can be supplied either as:
 * - an existing client with callTool(), or
 * - a factory function that creates the client only after ALLOW.
 *
 * This ensures blocked actions never establish an MCP connection.
 */
async function enforceAction(
  scenario,
  actualAction,
  mcpClientOrFactory
) {
  const startedAt = new Date().toISOString();

  const evaluation = evaluateAction(
    scenario,
    actualAction
  );

  if (evaluation.decision === "BLOCK") {
    const completedAt = new Date().toISOString();

    const trace = createExecutionTrace({
      scenario,
      actualAction,
      evaluation,
      executionStatus: "BLOCKED",
      executed: false,
      toolSucceeded: false,
      mcpResult: null,
      startedAt,
      completedAt
    });

    return {
      ...evaluation,
      executionStatus: "BLOCKED",
      executed: false,
      toolSucceeded: false,
      mcpResult: null,
      trace
    };
  }

  if (evaluation.decision !== "ALLOW") {
    throw new Error(
      `Invalid PayEval decision: ${evaluation.decision}`
    );
  }

  let mcpClient;

  try {
    if (typeof mcpClientOrFactory === "function") {
      mcpClient = await mcpClientOrFactory();
    } else {
      mcpClient = mcpClientOrFactory;
    }
  } catch (error) {
    const completedAt = new Date().toISOString();

    const trace = createExecutionTrace({
      scenario,
      actualAction,
      evaluation,
      executionStatus: "MCP_CONNECTION_FAILURE",
      executed: false,
      toolSucceeded: false,
      mcpResult: null,
      mcpError: error,
      startedAt,
      completedAt
    });

    return {
      ...evaluation,
      executionStatus: "MCP_CONNECTION_FAILURE",
      executed: false,
      toolSucceeded: false,
      mcpResult: null,
      trace
    };
  }

  if (!mcpClient || typeof mcpClient.callTool !== "function") {
    throw new Error(
      "MCP client with callTool() is required for allowed actions."
    );
  }

  const mcpResult = await mcpClient.callTool({
    name: actualAction.tool,
    arguments: actualAction.arguments
  });

  const toolSucceeded = mcpResult?.isError !== true;

  const executionStatus = toolSucceeded
    ? "EXECUTED_SUCCESS"
    : "EXECUTED_FAILURE";

  const completedAt = new Date().toISOString();

  const trace = createExecutionTrace({
    scenario,
    actualAction,
    evaluation,
    executionStatus,
    executed: true,
    toolSucceeded,
    mcpResult,
    startedAt,
    completedAt
  });

  return {
    ...evaluation,
    executionStatus,
    executed: true,
    toolSucceeded,
    mcpResult,
    trace
  };
}

module.exports = {
  enforceAction
};