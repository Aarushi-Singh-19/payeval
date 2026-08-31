const fs = require("fs");
const path = require("path");

const { validateScenario } = require("./scenario-validator");
const { executeProposedAction } = require("../agent/enforced-action");

const scenariosDir = path.join(__dirname, "..", "scenarios");

/**
 * Run the complete PAYEVAL scenario suite as a security benchmark.
 *
 * The benchmark measures whether the configured policy correctly:
 * - allows compliant actions
 * - blocks policy violations
 * - prevents blocked actions from reaching MCP
 * - produces the expected execution outcome
 */
async function runBenchmark(scenarioFiles) {
  if (!Array.isArray(scenarioFiles) || scenarioFiles.length === 0) {
    throw new Error("Benchmark requires at least one scenario.");
  }

  const results = [];

  for (const filename of scenarioFiles) {
    const scenarioPath = path.join(scenariosDir, filename);

    if (!fs.existsSync(scenarioPath)) {
      throw new Error(
        `Benchmark scenario not found: ${filename}`
      );
    }

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

        const { createMcpClient } = require("../agent/mcp-client");

        return await createMcpClient();
      }
    );

    const expected = scenario.expected;

    const checks = {
      decision:
        expected.decision === undefined ||
        result.decision === expected.decision,

      violation:
        expected.violation === undefined ||
        result.violation === expected.violation,

      executed:
        expected.executed === undefined ||
        result.executed === expected.executed,

      toolSucceeded:
        expected.toolSucceeded === undefined ||
        result.toolSucceeded === expected.toolSucceeded,

      mcpFactoryCalls:
        expected.mcpFactoryCalls === undefined ||
        mcpFactoryCalls === expected.mcpFactoryCalls
    };

    const passed = Object.values(checks).every(Boolean);

    results.push({
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      risk: scenario.risk,

      expected: {
        decision: expected.decision,
        violation: expected.violation ?? null,
        executed: expected.executed ?? null,
        toolSucceeded: expected.toolSucceeded ?? null,
        mcpFactoryCalls: expected.mcpFactoryCalls ?? null
      },

      actual: {
        decision: result.decision,
        violation: result.violation ?? null,
        executed: result.executed,
        toolSucceeded: result.toolSucceeded,
        executionStatus: result.executionStatus,
        mcpFactoryCalls
      },

      checks,
      passed
    });
  }

  return buildBenchmarkSummary(results);
}

function buildBenchmarkSummary(results) {
  const total = results.length;
  const passed = results.filter(
    (result) => result.passed
  ).length;

  const failed = total - passed;

  const blocked = results.filter(
    (result) => result.actual.decision === "BLOCK"
  ).length;

  const allowed = results.filter(
    (result) => result.actual.decision === "ALLOW"
  ).length;

  const blockedResults = results.filter(
    (result) => result.actual.decision === "BLOCK"
  );

  const blockedMcpCalls = blockedResults.reduce(
    (totalCalls, result) =>
      totalCalls + result.actual.mcpFactoryCalls,
    0
  );

  const unauthorizedActions = results.filter(
    (result) =>
      result.actual.violation ===
      "UNAUTHORIZED_FINANCIAL_ACTION"
  ).length;

  const monetaryLimitViolations = results.filter(
    (result) =>
      result.actual.violation ===
      "MONETARY_LIMIT_EXCEEDED"
  ).length;

  const absoluteLimitViolations = results.filter(
    (result) =>
      result.actual.violation ===
      "ABSOLUTE_TRANSACTION_LIMIT_EXCEEDED"
  ).length;

  const unauthorizedTools = results.filter(
    (result) =>
      result.actual.violation ===
      "UNAUTHORIZED_TOOL"
  ).length;

  const missingArguments = results.filter(
    (result) =>
      result.actual.violation ===
      "MISSING_REQUIRED_ARGUMENT"
  ).length;

  const successfulAllowedActions = results.filter(
    (result) =>
      result.actual.decision === "ALLOW" &&
      result.actual.toolSucceeded === true
  ).length;

  const allowedActions = results.filter(
    (result) =>
      result.actual.decision === "ALLOW"
  ).length;

  const policyEnforcementRate =
    total === 0
      ? 0
      : Number(((passed / total) * 100).toFixed(2));

  const allowedExecutionSuccessRate =
    allowedActions === 0
      ? 0
      : Number(
          (
            (successfulAllowedActions / allowedActions) *
            100
          ).toFixed(2)
        );

  const blockedMcpLeakageRate =
    blocked === 0
      ? 0
      : Number(
          (
            (blockedMcpCalls / blocked) *
            100
          ).toFixed(2)
        );

  const riskBreakdown = {};

  for (const result of results) {
    if (!riskBreakdown[result.risk]) {
      riskBreakdown[result.risk] = {
        total: 0,
        passed: 0,
        failed: 0
      };
    }

    riskBreakdown[result.risk].total++;

    if (result.passed) {
      riskBreakdown[result.risk].passed++;
    } else {
      riskBreakdown[result.risk].failed++;
    }
  }

  return {
    benchmarkVersion: "1.0",

    summary: {
      totalScenarios: total,
      passedScenarios: passed,
      failedScenarios: failed,

      overallStatus:
        failed === 0
          ? "PASS"
          : "FAIL",

      policyEnforcementRate,

      allowedActions: allowed,
      blockedActions: blocked,

      allowedExecutionSuccessRate,

      blockedMcpLeakageRate
    },

    violations: {
      unauthorizedFinancialActions: unauthorizedActions,
      monetaryLimitExceeded: monetaryLimitViolations,
      absoluteTransactionLimitExceeded:
        absoluteLimitViolations,
      unauthorizedTools,
      missingRequiredArguments: missingArguments
    },

    riskBreakdown,

    results
  };
}

module.exports = {
  runBenchmark,
  buildBenchmarkSummary
};