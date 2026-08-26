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

// Case 3: Unauthorized tool → must be blocked.
const unauthorizedToolScenarioPath = path.join(
  __dirname,
  "..",
  "scenarios",
  "unauthorized-tool.json"
);

const unauthorizedToolScenario = JSON.parse(
  fs.readFileSync(
    unauthorizedToolScenarioPath,
    "utf8"
  )
);

const unauthorizedToolAction = {
  tool: unauthorizedToolScenario.agent.requested_action,

  authorized:
    unauthorizedToolScenario.agent.authorized === true,

  arguments:
    unauthorizedToolScenario.agent.arguments
};

const unauthorizedToolResult = evaluateAction(
  unauthorizedToolScenario,
  unauthorizedToolAction
);

console.log("\n=== UNAUTHORIZED TOOL ===");
console.log("Tool:", unauthorizedToolAction.tool);
console.log("Result:");
console.log(
  JSON.stringify(
    unauthorizedToolResult,
    null,
    2
  )
);

if (
  unauthorizedToolResult.status !== "FAIL" ||
  unauthorizedToolResult.decision !== "BLOCK" ||
  unauthorizedToolResult.violation !== "UNAUTHORIZED_TOOL"
) {
  console.error("\n❌ UNAUTHORIZED TOOL TEST FAILED");
  process.exit(1);
}

console.log("\n✅ UNAUTHORIZED TOOL TEST PASSED");
function runInputSafetyTest(
  name,
  argumentsValue,
  policyOverrides,
  expectedViolation
) {
  const inputSafetyScenario = {
    ...scenario,
    policy: {
      ...scenario.policy,
      ...policyOverrides
    }
  };

  const actualAction = {
    tool: "create_order",
    authorized: true,
    arguments: argumentsValue
  };

  const result = evaluateAction(
    inputSafetyScenario,
    actualAction
  );

  console.log(`\n=== ${name} ===`);
  console.log("Arguments:", argumentsValue);
  console.log("Result:");
  console.log(JSON.stringify(result, null, 2));

  if (
    result.decision !== "BLOCK" ||
    result.violation !== expectedViolation
  ) {
    console.error("\n❌ TEST FAILED");
    process.exit(1);
  }

  console.log("\n✅ TEST PASSED");
}

runInputSafetyTest(
  "MISSING REQUIRED AMOUNT",
  {
    currency: "INR"
  },
  {
    required_arguments: {
  create_order: ["amount", "currency"]
}
  },
  "MISSING_REQUIRED_ARGUMENT"
);

runInputSafetyTest(
  "STRING AMOUNT",
  {
    amount: "500",
    currency: "INR"
  },
  {},
  "INVALID_TRANSACTION_AMOUNT"
);

runInputSafetyTest(
  "NEGATIVE AMOUNT",
  {
    amount: -500,
    currency: "INR"
  },
  {},
  "INVALID_TRANSACTION_AMOUNT"
);

runInputSafetyTest(
  "UNSUPPORTED CURRENCY",
  {
    amount: 500,
    currency: "USD"
  },
  {
    supported_currencies: ["INR"]
  },
  "UNSUPPORTED_CURRENCY"
);

console.log("\n================================");
console.log("✅ ALL POLICY TESTS PASSED");
console.log("================================\n");