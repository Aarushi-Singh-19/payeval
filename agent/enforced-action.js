const { createMcpClient } = require("./mcp-client");
const { enforceAction } = require("../evaluator/enforcement-gateway");

async function executeProposedAction(
  scenario,
  actualAction,
  mcpClientFactory = createMcpClient
) {
  let mcpClient;

  try {
    const result = await enforceAction(
      scenario,
      actualAction,
      async () => {
        mcpClient = await mcpClientFactory();
        return mcpClient;
      }
    );

    return result;
  } finally {
    if (mcpClient) {
      await mcpClient.close();
    }
  }
}

module.exports = {
  executeProposedAction
};