const fs = require("fs");
const path = require("path");

const {
  validateScenario
} = require("./evaluator/scenario-validator");

const {
  executeProposedAction
} = require("./agent/enforced-action");

const scenariosDir = path.join(__dirname, "scenarios");
const reportsDir = path.join(__dirname, "reports");

const scenarioFiles = [
  "unauthorized-payment.json",
  "amount-limit-exceeded.json",
  "allowed-read.json",
  "authorized-payment-within-limit.json",
  "authorized-payment-above-absolute-limit.json"
];

async function runScenario(filename) {
  const scenarioPath = path.join(scenariosDir, filename);

const scenario = JSON.parse(
  fs.readFileSync(scenarioPath, "utf8")
);

const validation = validateScenario(scenario);

if (!validation.valid) {
  throw new Error(
    `SCENARIO VALIDATION FAILED: ${scenario.id || filename}\n` +
    validation.errors
      .map((error) => `- ${error}`)
      .join("\n")
  );
}

const actualAction = {
    tool: scenario.agent.requested_action,
    authorized: scenario.agent.authorized === true,
    arguments: scenario.agent.arguments
  };

  let mcpFactoryCalls = 0;

  const result = await executeProposedAction(
    scenario,
    actualAction,
    async () => {
      mcpFactoryCalls++;

      const { createMcpClient } = require("./agent/mcp-client");

      return await createMcpClient();
    }
  );

return {
  scenarioId: scenario.id,
  scenarioName: scenario.name,
  risk: scenario.risk,
  expected: scenario.expected,

  action: {
      tool: actualAction.tool,
      authorized: actualAction.authorized,
      arguments: actualAction.arguments
    },

    policy: {
      decision: result.decision,
      status: result.status,
      reason: result.reason,
      violation: result.violation,
      exposure: result.exposure
    },

    execution: {
      status: result.executionStatus,
      executed: result.executed,
      toolSucceeded: result.toolSucceeded,
      mcpFactoryCalls
    },

    trace: result.trace
  };
}

function validateResults(results) {
  for (const result of results) {
    const expected = result.expected;

    if (!expected) {
      throw new Error(
        `SCENARIO CONFIGURATION ERROR: Scenario ${result.scenarioId} has no expected result.`
      );
    }

    if (
      expected.decision !== undefined &&
      result.policy.decision !== expected.decision
    ) {
      throw new Error(
        `EVALUATION FAILURE: ${result.scenarioId} expected decision ${expected.decision} but received ${result.policy.decision}.`
      );
    }

    if (
      expected.violation !== undefined &&
      result.policy.violation !== expected.violation
    ) {
      throw new Error(
        `EVALUATION FAILURE: ${result.scenarioId} expected violation ${expected.violation} but received ${result.policy.violation}.`
      );
    }

    if (
      expected.executed !== undefined &&
      result.execution.executed !== expected.executed
    ) {
      throw new Error(
        `EVALUATION FAILURE: ${result.scenarioId} expected executed=${expected.executed} but received executed=${result.execution.executed}.`
      );
    }

    if (
      expected.toolSucceeded !== undefined &&
      result.execution.toolSucceeded !== expected.toolSucceeded
    ) {
      throw new Error(
        `EVALUATION FAILURE: ${result.scenarioId} expected toolSucceeded=${expected.toolSucceeded} but received toolSucceeded=${result.execution.toolSucceeded}.`
      );
    }

    if (
      expected.mcpFactoryCalls !== undefined &&
      result.execution.mcpFactoryCalls !== expected.mcpFactoryCalls
    ) {
      throw new Error(
        `EVALUATION FAILURE: ${result.scenarioId} expected MCP factory calls=${expected.mcpFactoryCalls} but received ${result.execution.mcpFactoryCalls}.`
      );
    }
  }
}

async function main() {
  console.log("\n========================================");
  console.log("           PAYEVAL EVALUATION");
  console.log("========================================\n");

  const results = [];

  for (const filename of scenarioFiles) {
    console.log(`Running: ${filename}`);

    const result = await runScenario(filename);

    results.push(result);

    console.log(
      `Decision: ${result.policy.decision}`
    );

    console.log(
      `Execution: ${result.execution.status}`
    );

    console.log(
      `Executed: ${result.execution.executed}`
    );

    console.log(
      `MCP factory calls: ${result.execution.mcpFactoryCalls}`
    );

    console.log("----------------------------------------");
  }

  // Validate the complete evaluation.
  validateResults(results);

  const passed = results.length === scenarioFiles.length;

  const report = {
    reportVersion: "1.0",
    generatedAt: new Date().toISOString(),

    evaluator: {
      name: "PAYEVAL",
      version: "1.0.0"
    },

    summary: {
      totalScenarios: results.length,
      passedScenarios: passed ? results.length : 0,
      failedScenarios: passed ? 0 : results.length,
      overallStatus: passed ? "PASS" : "FAIL"
    },

    results
  };

  fs.mkdirSync(reportsDir, {
    recursive: true
  });

  const reportPath = path.join(
    reportsDir,
    "evaluation-report.json"
  );

  fs.writeFileSync(
    reportPath,
    JSON.stringify(report, null, 2) + "\n",
    "utf8"
  );

  console.log("\n========================================");
  console.log("             FINAL RESULT");
  console.log("========================================\n");

  for (const result of results) {
    const icon =
      result.policy.decision === "BLOCK"
        ? "🔴"
        : "🟢";

    console.log(
      `${icon} ${result.scenarioName}: ${result.policy.decision}`
    );

    console.log(
      `   Execution: ${result.execution.status}`
    );

    console.log(
      `   Executed: ${result.execution.executed}`
    );

    console.log(
      `   MCP connections: ${result.execution.mcpFactoryCalls}`
    );

    if (result.policy.violation) {
      console.log(
        `   Violation: ${result.policy.violation}`
      );
    }

    console.log("");
  }

  console.log("========================================");
  console.log("       PAYEVAL EVALUATION PASSED");
  console.log("========================================\n");

  console.log(
    `📄 Report written to: ${path.relative(
      __dirname,
      reportPath
    )}`
  );

  console.log("");
}

main().catch((error) => {
  console.error("\n========================================");
  console.error("       PAYEVAL EVALUATION FAILED");
  console.error("========================================\n");

  console.error(error);

  process.exit(1);
});