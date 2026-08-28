const fs = require("fs");
const path = require("path");

const { enforceAction } = require("./enforcement-gateway");

const scenariosDir = path.join(__dirname, "..", "scenarios");

function loadScenario(scenarioId) {
  if (typeof scenarioId !== "string" || scenarioId.length === 0) {
    throw new Error("Trace must contain a valid scenarioId.");
  }

  const scenarioPath = path.join(
    scenariosDir,
    `${scenarioId}.json`
  );

  if (!fs.existsSync(scenarioPath)) {
    throw new Error(
      `Scenario not found for replay: ${scenarioId}`
    );
  }

  return JSON.parse(
    fs.readFileSync(scenarioPath, "utf8")
  );
}

/**
 * Safely replay a saved PAYEVAL trace.
 *
 * Replay always passes through the enforcement gateway again.
 * No real MCP client is created.
 *
 * The MCP boundary is deterministic:
 * - EXECUTED_SUCCESS -> return recorded success result
 * - EXECUTED_FAILURE -> return recorded failure result
 * - MCP_CONNECTION_FAILURE -> simulate the recorded connection failure
 * - BLOCKED -> the gateway must never invoke the MCP boundary
 */
async function replayTrace(trace) {
  if (!trace || typeof trace !== "object") {
    throw new Error("A valid execution trace is required.");
  }

  if (!trace.action || typeof trace.action.tool !== "string") {
    throw new Error(
      "Trace must contain a valid action."
    );
  }

  if (typeof trace.action.authorized !== "boolean") {
    throw new Error(
      "Trace action must contain an authorized boolean."
    );
  }

  if (!trace.execution || typeof trace.execution.status !== "string") {
    throw new Error(
      "Trace must contain a valid execution status."
    );
  }

  const scenario = loadScenario(trace.scenarioId);

  const actualAction = {
    tool: trace.action.tool,
    authorized: trace.action.authorized,
    arguments: trace.action.arguments ?? {}
  };

  let replayMcpCalls = 0;

  const replayStatus = trace.execution.status;

  let mcpClientOrFactory;

  if (replayStatus === "BLOCKED") {
    // If policy blocks, this client should never be touched.
    mcpClientOrFactory = {
      async callTool() {
        throw new Error(
          "Replay security failure: blocked action reached MCP."
        );
      }
    };
  } else if (replayStatus === "MCP_CONNECTION_FAILURE") {
    mcpClientOrFactory = async () => {
      replayMcpCalls++;

      const originalError =
        trace.mcp?.error?.message ||
        "Replayed MCP connection failure";

      throw new Error(originalError);
    };
  } else if (replayStatus === "EXECUTED_FAILURE") {
    mcpClientOrFactory = {
      async callTool() {
        replayMcpCalls++;

        return (
          trace.mcp?.result ?? {
            isError: true,
            content: [
              {
                type: "text",
                text: "Replayed MCP tool failure"
              }
            ]
          }
        );
      }
    };
  } else if (replayStatus === "EXECUTED_SUCCESS") {
    mcpClientOrFactory = {
      async callTool() {
        replayMcpCalls++;

        return (
          trace.mcp?.result ?? {
            content: [
              {
                type: "text",
                text: "Replayed MCP execution"
              }
            ]
          }
        );
      }
    };
  } else {
    throw new Error(
      `Unsupported execution status for replay: ${replayStatus}`
    );
  }

  const replayResult = await enforceAction(
    scenario,
    actualAction,
    mcpClientOrFactory
  );

  return {
    originalTrace: trace,

    replay: {
      scenarioId: trace.scenarioId,

      action: actualAction,

      policy: {
        decision: replayResult.decision,
        reason: replayResult.reason,
        violation: replayResult.violation,
        exposure: replayResult.exposure
      },

      execution: {
        status: replayResult.executionStatus,
        executed: replayResult.executed,
        toolSucceeded: replayResult.toolSucceeded
      },

      mcpCalls: replayMcpCalls
    },

    consistency: {
      policyDecisionMatches:
        replayResult.decision === trace.policy.decision,

      executionStatusMatches:
        replayResult.executionStatus ===
        trace.execution.status
    }
  };
}

module.exports = {
  replayTrace
};
