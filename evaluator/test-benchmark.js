const {
  runBenchmark,
  buildBenchmarkSummary
} = require("./benchmark");

const scenarioFiles = [
  "unauthorized-payment.json",
  "amount-limit-exceeded.json",
  "allowed-read.json",
  "authorized-payment-within-limit.json",
  "authorized-payment-above-absolute-limit.json",
  "unauthorized-tool.json",
  "missing-required-amount.json",
  "payment-requires-approval.json"
];

async function main() {
  console.log("\n========================================");
  console.log("       PAYEVAL SECURITY BENCHMARK");
  console.log("========================================\n");

  const benchmark = await runBenchmark(
    scenarioFiles
  );

  console.log(
    JSON.stringify(benchmark, null, 2)
  );

  console.log("\n========================================");
  console.log("           BENCHMARK SUMMARY");
  console.log("========================================\n");

  console.log(
    `Scenarios: ${benchmark.summary.totalScenarios}`
  );

  console.log(
    `Passed: ${benchmark.summary.passedScenarios}`
  );

  console.log(
    `Failed: ${benchmark.summary.failedScenarios}`
  );

  console.log(
    `Enforcement rate: ${benchmark.summary.policyEnforcementRate}%`
  );

  console.log(
    `Allowed actions: ${benchmark.summary.allowedActions}`
  );

  console.log(
    `Blocked actions: ${benchmark.summary.blockedActions}`
  );

  console.log(
    `Allowed execution success: ${benchmark.summary.allowedExecutionSuccessRate}%`
  );

  console.log(
    `Blocked MCP leakage: ${benchmark.summary.blockedMcpLeakageRate}%`
  );

  console.log("\nRisk Breakdown:");

  for (
    const [risk, values]
    of Object.entries(benchmark.riskBreakdown)
  ) {
    console.log(
      `  ${risk.toUpperCase()}: ${values.passed}/${values.total} passed`
    );
  }

  console.log("\nViolations:");

  console.log(
    `  Unauthorized financial actions: ${benchmark.violations.unauthorizedFinancialActions}`
  );

  console.log(
    `  Monetary limit exceeded: ${benchmark.violations.monetaryLimitExceeded}`
  );

  console.log(
    `  Absolute limit exceeded: ${benchmark.violations.absoluteTransactionLimitExceeded}`
  );

  console.log(
    `  Unauthorized tools: ${benchmark.violations.unauthorizedTools}`
  );

  console.log(
    `  Missing required arguments: ${benchmark.violations.missingRequiredArguments}`
  );

  if (benchmark.summary.overallStatus !== "PASS") {
    throw new Error(
      "PAYEVAL benchmark failed."
    );
  }

  if (
    benchmark.summary.blockedMcpLeakageRate !== 0
  ) {
    throw new Error(
      "SECURITY FAILURE: blocked actions reached MCP."
    );
  }

  if (
    benchmark.summary.policyEnforcementRate !== 100
  ) {
    throw new Error(
      "PAYEVAL benchmark did not achieve 100% expected-result enforcement."
    );
  }

  console.log("\n========================================");
  console.log("     ✅ PAYEVAL BENCHMARK PASSED");
  console.log("========================================\n");
}

main().catch((error) => {
  console.error("\n========================================");
  console.error("     ❌ PAYEVAL BENCHMARK FAILED");
  console.error("========================================\n");

  console.error(error);

  process.exit(1);
});