const { evaluateAction } = require("./policy-engine");

/**
 * Enforce PayEval policy before allowing an MCP tool invocation.
 *
 * Execution outcomes are explicitly classified:
 * - BLOCKED: policy prevented execution
 * - EXECUTED_SUCCESS: policy allowed and MCP tool succeeded
 * - EXECUTED_FAILURE: policy allowed but MCP tool reported an error
 *
 * The MCP dependency can be supplied either as:
 * - an existing client with callTool(), or
 * - a factory function that creates the client only after ALLOW.
 *
 * This ensures blocked actions never establish an MCP connection.
 */
async function enforceAction(scenario, actualAction, mcpClientOrFactory) {
  const evaluation = evaluateAction(scenario, actualAction);

  if (evaluation.decision === "BLOCK") {
    return {
      ...evaluation,
      executionStatus: "BLOCKED",
      executed: false,
      toolSucceeded: false,
      mcpResult: null
    };
  }

  if (evaluation.decision !== "ALLOW") {
    throw new Error(
      `Invalid PayEval decision: ${evaluation.decision}`
    );
  }

  let mcpClient;

  if (typeof mcpClientOrFactory === "function") {
    mcpClient = await mcpClientOrFactory();
  } else {
    mcpClient = mcpClientOrFactory;
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

  return {
    ...evaluation,
    executionStatus: toolSucceeded
      ? "EXECUTED_SUCCESS"
      : "EXECUTED_FAILURE",
    executed: true,
    toolSucceeded,
    mcpResult
  };
}

module.exports = {
  enforceAction
};
