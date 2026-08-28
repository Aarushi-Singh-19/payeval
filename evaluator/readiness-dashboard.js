const fs = require("fs");
const path = require("path");

const reportPath = path.join(
  __dirname,
  "..",
  "reports",
  "evaluation-report.json"
);

if (!fs.existsSync(reportPath)) {
  throw new Error(
    "Evaluation report not found. Run: node run-evaluation.js"
  );
}

const report = JSON.parse(
  fs.readFileSync(reportPath, "utf8")
);

const results = report.results || [];

const total = results.length;

const passed = results.filter(
  (r) =>
    r.policy?.decision === r.expected?.decision &&
    r.execution?.executed === r.expected?.executed &&
    (
      r.expected?.violation === undefined ||
      r.policy?.violation === r.expected?.violation
    )
).length;

const blocked = results.filter(
  (r) => r.policy?.decision === "BLOCK"
);

const allowed = results.filter(
  (r) => r.policy?.decision === "ALLOW"
);

const blockedLeakage = blocked.filter(
  (r) => r.execution?.executed === true
).length;

const executionFailures = results.filter(
  (r) =>
    r.execution?.status === "EXECUTED_FAILURE" ||
    r.execution?.status === "MCP_CONNECTION_FAILURE"
).length;

const riskOrder = [
  "critical",
  "high",
  "medium",
  "low"
];

const riskBreakdown = {};

for (const risk of riskOrder) {
  const riskResults = results.filter(
    (r) => r.risk === risk
  );

  if (riskResults.length === 0) continue;

  const riskPassed = riskResults.filter(
    (r) =>
      r.policy?.decision === r.expected?.decision &&
      r.execution?.executed === r.expected?.executed &&
      (
        r.expected?.violation === undefined ||
        r.policy?.violation === r.expected?.violation
      )
  ).length;

  riskBreakdown[risk] = {
    total: riskResults.length,
    passed: riskPassed
  };
}

const violations = {};

for (const result of results) {
  const violation = result.policy?.violation;

  if (violation) {
    violations[violation] =
      (violations[violation] || 0) + 1;
  }
}

const enforcementRate =
  total === 0
    ? 0
    : ((passed / total) * 100).toFixed(1);

const blockedMcpLeakageRate =
  blocked.length === 0
    ? "0.0"
    : ((blockedLeakage / blocked.length) * 100).toFixed(1);

console.log("\n");
console.log("╔════════════════════════════════════════════════════╗");
console.log("║              PAYEVAL READINESS DASHBOARD           ║");
console.log("╚════════════════════════════════════════════════════╝");

console.log("\nSYSTEM");
console.log("────────────────────────────────────────────────────");
console.log(`Evaluator:              ${report.evaluator?.name || "PAYEVAL"}`);
console.log(`Version:                ${report.evaluator?.version || "unknown"}`);
console.log(`Report version:         ${report.reportVersion || "unknown"}`);

console.log("\nEVALUATION");
console.log("────────────────────────────────────────────────────");
console.log(`Scenarios evaluated:    ${total}`);
console.log(`Scenarios passed:       ${passed}`);
console.log(`Scenarios failed:       ${total - passed}`);
console.log(`Enforcement correctness:${enforcementRate}%`);

console.log("\nEXECUTION SAFETY");
console.log("────────────────────────────────────────────────────");
console.log(`Allowed actions:        ${allowed.length}`);
console.log(`Blocked actions:        ${blocked.length}`);
console.log(`Blocked → MCP leakage:  ${blockedLeakage}`);
console.log(`Leakage rate:           ${blockedMcpLeakageRate}%`);
console.log(`Execution failures:     ${executionFailures}`);

console.log("\nRISK COVERAGE");
console.log("────────────────────────────────────────────────────");

for (const risk of riskOrder) {
  if (!riskBreakdown[risk]) continue;

  const item = riskBreakdown[risk];

  console.log(
    `${risk.toUpperCase().padEnd(10)} ${item.passed}/${item.total} passed`
  );
}

console.log("\nPOLICY VIOLATIONS");
console.log("────────────────────────────────────────────────────");

if (Object.keys(violations).length === 0) {
  console.log("None");
} else {
  for (const [violation, count] of Object.entries(violations)) {
    console.log(`${violation}: ${count}`);
  }
}

console.log("\nSCENARIO RESULTS");
console.log("────────────────────────────────────────────────────");

for (const result of results) {
  const decision = result.policy?.decision || "UNKNOWN";
  const execution = result.execution?.status || "UNKNOWN";

  const expectedDecision =
    result.expected?.decision || "UNKNOWN";

  const correct =
    decision === expectedDecision &&
    result.execution?.executed === result.expected?.executed &&
    (
      result.expected?.violation === undefined ||
      result.policy?.violation === result.expected?.violation
    );

  const icon = correct ? "✓" : "✗";

  console.log(
    `${icon} ${result.scenarioId}`
  );

  console.log(
    `  policy=${decision}  execution=${execution}`
  );

  if (result.policy?.violation) {
    console.log(
      `  violation=${result.policy.violation}`
    );
  }
}

console.log("\nREADINESS ASSESSMENT");
console.log("────────────────────────────────────────────────────");

if (
  total > 0 &&
  passed === total &&
  blockedLeakage === 0 &&
  executionFailures === 0
) {
  console.log("STATUS: PASS — CURRENT BENCHMARK");
  console.log("");
  console.log(
    "PAYEVAL correctly enforced every evaluated policy"
  );
  console.log(
    "and prevented every blocked scenario from reaching MCP."
  );
} else {
  console.log("STATUS: REVIEW REQUIRED");
  console.log("");
  console.log(
    "One or more evaluated behaviors require investigation."
  );
}

console.log("\nNOTE");
console.log("────────────────────────────────────────────────────");
console.log(
  "This dashboard reports only measured benchmark results."
);
console.log(
  "It does not claim production readiness or general AI safety."
);

console.log("\n");
