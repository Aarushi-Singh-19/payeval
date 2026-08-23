const fs = require("fs");
const path = require("path");

const { enforceAction } = require("./enforcement-gateway");

const scenarioPath = path.join(
  __dirname,
  "..",
  "scenarios",
  "allowed-read.json"
);

const scenario = JSON.parse(
  fs.readFileSync(scenarioPath, "utf8")
);

async function main() {
  let mcpCallCount = 0;

  const fakeMcpClient = {
    async callTool(request) {
      mcpCallCount++;

      return {
        isError: true,
        content: [
          {
            type: "text",
            text: "Simulated downstream MCP failure"
          }
        ],
        request
      };
    }
  };

  const actualAction = {
    tool: scenario.agent.requested_action,
    authorized: true,
    arguments: scenario.agent.arguments
  };

  const result = await enforceAction(
    scenario,
    actualAction,
    fakeMcpClient
  );

  console.log("\n=== PAYEVAL ALLOW → MCP FAILURE TEST ===\n");
  console.log(JSON.stringify(result, null, 2));

  console.log("\nMCP call count:", mcpCallCount);

  if (result.decision !== "ALLOW") {
    throw new Error(
      `Expected ALLOW but received ${result.decision}`
    );
  }

  if (result.executionStatus !== "EXECUTED_FAILURE") {
    throw new Error(
      `Expected EXECUTED_FAILURE but received ${result.executionStatus}`
    );
  }

  if (result.executed !== true) {
    throw new Error(
      "An allowed action that reaches MCP must be marked executed."
    );
  }

  if (result.toolSucceeded !== false) {
    throw new Error(
      "An MCP error response must produce toolSucceeded=false."
    );
  }

  if (!result.mcpResult) {
    throw new Error(
      "Expected the MCP failure result to be preserved."
    );
  }

  if (result.mcpResult.isError !== true) {
    throw new Error(
      "Expected MCP result to preserve isError=true."
    );
  }

  if (!result.trace) {
    throw new Error(
      "Expected an execution trace."
    );
  }

  if (result.trace.policy.decision !== "ALLOW") {
    throw new Error(
      "Trace must preserve the ALLOW policy decision."
    );
  }

  if (result.trace.execution.status !== "EXECUTED_FAILURE") {
    throw new Error(
      "Trace must classify the execution as EXECUTED_FAILURE."
    );
  }

  if (result.trace.execution.executed !== true) {
    throw new Error(
      "Trace must mark the failed MCP execution as executed."
    );
  }

  if (result.trace.execution.toolSucceeded !== false) {
    throw new Error(
      "Trace must mark the failed MCP tool as unsuccessful."
    );
  }

  if (!result.trace.mcp) {
    throw new Error(
      "Trace must contain the MCP result for an executed action."
    );
  }

  if (result.trace.mcp.result?.isError !== true) {
    throw new Error(
      "Trace must preserve the MCP error result."
    );
  }

  if (mcpCallCount !== 1) {
    throw new Error(
      `Expected exactly 1 MCP call, received ${mcpCallCount}`
    );
  }

  console.log("\n✅ ALLOW → MCP FAILURE TEST PASSED");
  console.log("✅ Policy allowed the action");
  console.log("✅ MCP was actually invoked");
  console.log("✅ MCP failure was correctly classified");
  console.log("✅ Trace preserved the failure");
}

main().catch((error) => {
  console.error("\n❌ ALLOW → MCP FAILURE TEST FAILED\n");
  console.error(error);
  process.exit(1);
});