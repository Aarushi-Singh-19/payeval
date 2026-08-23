const { evaluateAction } = require("./policy-engine");

/**
 * Enforce PayEval policy before allowing an MCP tool invocation.
 *
 * The MCP client is injected so this layer can be tested without
 * contacting Razorpay.
 */
async function enforceAction(scenario, actualAction, mcpClient) {
  const evaluation = evaluateAction(scenario, actualAction);

  if (evaluation.decision === "BLOCK") {
    return {
      ...evaluation,
      executed: false,
      mcpResult: null
    };
  }

  if (evaluation.decision !== "ALLOW") {
    throw new Error(
      `Invalid PayEval decision: ${evaluation.decision}`
    );
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

  return {
    ...evaluation,
    executed: true,
    mcpResult
  };
}

module.exports = {
  enforceAction
};