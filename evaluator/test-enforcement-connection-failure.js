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
  let mcpFactoryCalls = 0;

  const failingMcpFactory = async () => {
    mcpFactoryCalls++;

    throw new Error(
      "Simulated MCP connection failure"
    );
  };

  const actualAction = {
    tool: scenario.agent.requested_action,
    authorized: true,
    arguments: scenario.agent.arguments
  };

  const result = await enforceAction(
    scenario,
    actualAction,
    failingMcpFactory
  );

  console.log(
    "\n=== PAYEVAL MCP CONNECTION FAILURE TEST ===\n"
  );

  console.log(
    JSON.stringify(result, null, 2)
  );

  console.log(
    "\nMCP factory calls:",
    mcpFactoryCalls
  );

  if (result.decision !== "ALLOW") {
    throw new Error(
      `Expected ALLOW but received ${result.decision}`
    );
  }

  if (
    result.executionStatus !==
    "MCP_CONNECTION_FAILURE"
  ) {
    throw new Error(
      `Expected MCP_CONNECTION_FAILURE but received ${result.executionStatus}`
    );
  }

  if (result.executed !== false) {
    throw new Error(
      "MCP connection failure must not be marked as executed."
    );
  }

  if (result.toolSucceeded !== false) {
    throw new Error(
      "MCP connection failure must produce toolSucceeded=false."
    );
  }

  if (result.mcpResult !== null) {
    throw new Error(
      "MCP result must be null when the connection fails."
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

  if (
    result.trace.execution.status !==
    "MCP_CONNECTION_FAILURE"
  ) {
    throw new Error(
      "Trace must classify the execution as MCP_CONNECTION_FAILURE."
    );
  }

  if (result.trace.execution.executed !== false) {
    throw new Error(
      "Trace must mark the action as not executed."
    );
  }

  if (result.trace.execution.toolSucceeded !== false) {
    throw new Error(
      "Trace must mark the tool as unsuccessful."
    );
  }

  if (!result.trace.mcp) {
    throw new Error(
      "Trace must contain MCP failure information."
    );
  }

  if (result.trace.mcp.result !== null) {
    throw new Error(
      "Trace MCP result must be null for a connection failure."
    );
  }

  if (!result.trace.mcp.error) {
    throw new Error(
      "Trace must contain the normalized MCP connection error."
    );
  }

  if (
    result.trace.mcp.error.name !==
    "Error"
  ) {
    throw new Error(
      `Unexpected error name: ${result.trace.mcp.error.name}`
    );
  }

  if (
    result.trace.mcp.error.message !==
    "Simulated MCP connection failure"
  ) {
    throw new Error(
      `Unexpected error message: ${result.trace.mcp.error.message}`
    );
  }

  if (mcpFactoryCalls !== 1) {
    throw new Error(
      `Expected exactly 1 MCP factory call, received ${mcpFactoryCalls}`
    );
  }

  console.log(
    "\n✅ MCP CONNECTION FAILURE TEST PASSED"
  );

  console.log(
    "✅ Policy allowed the action"
  );

  console.log(
    "✅ MCP connection was attempted"
  );

  console.log(
    "✅ Tool execution was correctly marked as false"
  );

  console.log(
    "✅ Connection failure was preserved in the trace"
  );
}

main().catch((error) => {
  console.error(
    "\n❌ MCP CONNECTION FAILURE TEST FAILED\n"
  );

  console.error(error);

  process.exit(1);
});