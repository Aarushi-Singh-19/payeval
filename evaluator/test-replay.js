const fs = require("fs");
const path = require("path");

const { replayTrace } = require("./replay");

const reportPath = path.join(
  __dirname,
  "..",
  "reports",
  "evaluation-report.json"
);

const report = JSON.parse(
  fs.readFileSync(reportPath, "utf8")
);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const blockedTrace = report.results.find(
    (result) =>
      result.scenarioId === "unauthorized-payment"
  )?.trace;

  const successfulTrace = report.results.find(
    (result) =>
      result.scenarioId ===
      "authorized-payment-within-limit"
  )?.trace;

  assert(
    blockedTrace,
    "Could not find blocked trace in evaluation report."
  );

  assert(
    successfulTrace,
    "Could not find successful trace in evaluation report."
  );

  console.log("\n=== PAYEVAL REPLAY TEST ===\n");

  console.log("Replaying blocked action...");
  const blockedReplay = await replayTrace(
    blockedTrace
  );

  console.log(
    JSON.stringify(blockedReplay, null, 2)
  );

  assert(
    blockedReplay.replay.policy.decision === "BLOCK",
    "Blocked trace must remain BLOCK during replay."
  );

  assert(
    blockedReplay.replay.execution.status ===
      "BLOCKED",
    "Blocked trace must remain BLOCKED during replay."
  );

  assert(
    blockedReplay.replay.execution.executed === false,
    "Blocked replay must not execute."
  );

  assert(
    blockedReplay.replay.mcpCalls === 0,
    "Blocked replay must not reach MCP."
  );

  assert(
    blockedReplay.consistency.policyDecisionMatches,
    "Blocked replay policy decision does not match original."
  );

  assert(
    blockedReplay.consistency.executionStatusMatches,
    "Blocked replay execution status does not match original."
  );

  console.log(
    "\n✅ Blocked action replay verified"
  );

  console.log(
    "\nReplaying successful action..."
  );

  const successfulReplay = await replayTrace(
    successfulTrace
  );

  console.log(
    JSON.stringify(successfulReplay, null, 2)
  );

  assert(
    successfulReplay.replay.policy.decision ===
      "ALLOW",
    "Successful trace must remain ALLOW during replay."
  );

  assert(
    successfulReplay.replay.execution.status ===
      "EXECUTED_SUCCESS",
    "Successful trace must remain EXECUTED_SUCCESS during replay."
  );

  assert(
    successfulReplay.replay.execution.executed ===
      true,
    "Successful replay must be marked executed."
  );

  assert(
    successfulReplay.replay.execution.toolSucceeded ===
      true,
    "Successful replay must be marked tool-successful."
  );

  assert(
    successfulReplay.replay.mcpCalls === 1,
    "Successful replay must use exactly one simulated MCP call."
  );

  assert(
    successfulReplay.consistency.policyDecisionMatches,
    "Successful replay policy decision does not match original."
  );

  assert(
    successfulReplay.consistency.executionStatusMatches,
    "Successful replay execution status does not match original."
  );

  console.log(
    "\n✅ Successful action replay verified"
  );

  console.log(
    "\n========================================"
  );
  console.log(
    "       PAYEVAL REPLAY TEST PASSED"
  );
  console.log(
    "========================================\n"
  );
}

main().catch((error) => {
  console.error(
    "\n❌ PAYEVAL REPLAY TEST FAILED\n"
  );

  console.error(error);

  process.exit(1);
});