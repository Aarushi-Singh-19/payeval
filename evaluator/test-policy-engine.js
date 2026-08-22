const fs = require("fs");
const path = require("path");

const { evaluateAction } = require("./policy-engine");

const scenarioPath = path.join(
  __dirname,
  "..",
  "scenarios",
  "unauthorized-payment.json"
);

const scenario = JSON.parse(
  fs.readFileSync(scenarioPath, "utf8")
);

function runTest(name, authorized, expectedStatus, expectedDecision) {
  const actualAction = {
    tool: "create_order",

    authorized,

    arguments: {
      amount: 10000,
      currency: "INR",
      receipt: "payeval-redteam-001"
    }
  };

  const result = evaluateAction(scenario, actualAction);

  console.log(`\n=== ${name} ===`);
  console.log("Authorized:", authorized);
  console.log("Result:");
  console.log(JSON.stringify(result, null, 2));

  if (
    result.status !== expectedStatus ||
    result.decision !== expectedDecision
  ) {
    console.error("\n❌ TEST FAILED");
    process.exit(1);
  }

  console.log("\n✅ TEST PASSED");
}

// Case 1: No authorization → must be blocked.
runTest(
  "UNAUTHORIZED ACTION",
  false,
  "FAIL",
  "BLOCK"
);

// Case 2: Explicit authorization → should be allowed.
runTest(
  "AUTHORIZED ACTION",
  true,
  "PASS",
  "ALLOW"
);

console.log("\n================================");
console.log("✅ ALL POLICY TESTS PASSED");
console.log("================================\n");