const { createExecutionTrace } = require("./execution-trace");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function testBlockedAction() {
  const scenario = {
    id: "unauthorized-payment"
  };

  const actualAction = {
    tool: "create_order",
    authorized: false,
    arguments: {
      amount: 10000,
      currency: "INR"
    }
  };

  const evaluation = {
    status: "FAIL",
    decision: "BLOCK",
    reason: "Financial transaction requires explicit user authorization.",
    violation: "UNAUTHORIZED_FINANCIAL_ACTION",
    exposure: 10000
  };

  const trace = createExecutionTrace({
    scenario,
    actualAction,
    evaluation,
    executionStatus: "BLOCKED",
    executed: false,
    toolSucceeded: false,
    mcpResult: null
  });

  assert(
    trace.scenarioId === "unauthorized-payment",
    "Incorrect scenarioId."
  );

  assert(
    typeof trace.runId === "string" && trace.runId.length > 0,
    "runId must be generated."
  );

  assert(
    trace.action.tool === "create_order",
    "Incorrect action tool."
  );

  assert(
    trace.policy.decision === "BLOCK",
    "Trace must preserve BLOCK decision."
  );

  assert(
    trace.execution.status === "BLOCKED",
    "Trace must preserve BLOCKED execution status."
  );

  assert(
    trace.execution.executed === false,
    "Blocked action must not be marked executed."
  );

  assert(
    trace.execution.toolSucceeded === false,
    "Blocked action must not be marked tool-successful."
  );

  assert(
    trace.mcp === null,
    "Blocked action must not contain an MCP result."
  );

  console.log("✅ BLOCK trace test passed");
}

function testAllowedExecution() {
  const scenario = {
    id: "allowed-read"
  };

  const actualAction = {
    tool: "fetch_all_orders",
    authorized: true,
    arguments: {}
  };

  const evaluation = {
    status: "PASS",
    decision: "ALLOW",
    reason: "Action complies with the configured policy.",
    violation: null,
    exposure: 0
  };

  const mcpResult = {
    content: [
      {
        type: "text",
        text: "simulated MCP execution"
      }
    ]
  };

  const trace = createExecutionTrace({
    scenario,
    actualAction,
    evaluation,
    executionStatus: "EXECUTED_SUCCESS",
    executed: true,
    toolSucceeded: true,
    mcpResult
  });

  assert(
    trace.scenarioId === "allowed-read",
    "Incorrect scenarioId."
  );

  assert(
    trace.policy.decision === "ALLOW",
    "Trace must preserve ALLOW decision."
  );

  assert(
    trace.execution.status === "EXECUTED_SUCCESS",
    "Trace must preserve success status."
  );

  assert(
    trace.execution.executed === true,
    "Allowed action must be marked executed."
  );

  assert(
    trace.execution.toolSucceeded === true,
    "Successful MCP execution must be marked successful."
  );

  assert(
    trace.mcp !== null,
    "Successful MCP execution must contain an MCP record."
  );

  assert(
    trace.mcp.tool === "fetch_all_orders",
    "Incorrect MCP tool."
  );

  assert(
    trace.mcp.result === mcpResult,
    "MCP result was not preserved."
  );

  console.log("✅ ALLOW trace test passed");
}

testBlockedAction();
testAllowedExecution();

console.log("\n✅ ALL EXECUTION TRACE TESTS PASSED");