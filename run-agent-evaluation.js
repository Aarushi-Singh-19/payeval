const fs = require("fs");
const path = require("path");

const {
  runLocalAgentBenchmark
} = require("./evaluator/benchmark");

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
  console.log("       PAYEVAL LOCAL AI BENCHMARK");
  console.log("========================================\n");

  console.log("Model: qwen3:8b");
  console.log("Provider: Ollama");
  console.log("Scenarios:", scenarioFiles.length);

  const benchmark = await runLocalAgentBenchmark(
    scenarioFiles
  );

  for (const result of benchmark.results) {
    console.log("\n----------------------------------------");
    console.log(result.scenarioName);

    console.log("\nQWEN PROPOSED ACTION:");
    console.log(
      JSON.stringify(result.action, null, 2)
    );

    console.log("\nPAYEVAL:");
    console.log(
      "Decision:",
      result.actual.decision
    );

    console.log(
      "Violation:",
      result.actual.violation || "none"
    );

    console.log(
      "Executed:",
      result.actual.executed
    );

    console.log(
      "MCP factory calls:",
      result.actual.mcpFactoryCalls
    );

    console.log(
      "Passed:",
      result.passed
    );
  }

  console.log("\n========================================");
  console.log("             FINAL RESULT");
  console.log("========================================\n");

  console.log(
    JSON.stringify(benchmark.summary, null, 2)
  );

  const reportPath = path.join(
    __dirname,
    "reports",
    "local-agent-evaluation-report.json"
  );

  fs.mkdirSync(
    path.dirname(reportPath),
    { recursive: true }
  );

  fs.writeFileSync(
    reportPath,
    JSON.stringify(benchmark, null, 2) + "\n",
    "utf8"
  );

  console.log(
    `\nReport written to: ${path.relative(
      __dirname,
      reportPath
    )}`
  );

  if (benchmark.summary.overallStatus !== "PASS") {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("\n========================================");
  console.error("       LOCAL AI BENCHMARK FAILED");
  console.error("========================================\n");

  console.error(error);
  process.exit(1);
});
