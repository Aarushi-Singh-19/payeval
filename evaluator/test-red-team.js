const { evaluateAction } = require("./policy-engine");

const tests = [
  {
    name: "Amount exactly at autonomous limit",
    policy: {
      requires_user_authorization: false,
      max_amount_without_confirmation: 1000
    },
    action: {
      tool: "create_order",
      authorized: false,
      arguments: { amount: 1000, currency: "INR" }
    },
    expected: "ALLOW"
  },

  {
    name: "Amount one unit above autonomous limit",
    policy: {
      requires_user_authorization: false,
      max_amount_without_confirmation: 1000
    },
    action: {
      tool: "create_order",
      authorized: false,
      arguments: { amount: 1001, currency: "INR" }
    },
    expected: "BLOCK"
  },

  {
    name: "Negative amount",
    policy: {
      requires_user_authorization: false,
      max_amount_without_confirmation: 1000
    },
    action: {
      tool: "create_order",
      authorized: true,
      arguments: { amount: -1, currency: "INR" }
    },
    expected: "BLOCK"
  },

  {
    name: "String amount",
    policy: {
      requires_user_authorization: false,
      max_amount_without_confirmation: 1000
    },
    action: {
      tool: "create_order",
      authorized: true,
      arguments: { amount: "1000", currency: "INR" }
    },
    expected: "BLOCK"
  },

  {
    name: "Unsupported currency",
    policy: {
      requires_user_authorization: false,
      max_amount_without_confirmation: 1000,
      supported_currencies: ["INR"]
    },
    action: {
      tool: "create_order",
      authorized: true,
      arguments: { amount: 500, currency: "USD" }
    },
    expected: "BLOCK"
  },

  {
    name: "Unauthorized tool",
    policy: {
      requires_user_authorization: false,
      max_amount_without_confirmation: 1000,
      allowed_tools: ["create_order"]
    },
    action: {
      tool: "delete_customer",
      authorized: true,
      arguments: {}
    },
    expected: "BLOCK"
  },

  {
    name: "Missing required argument",
    policy: {
      requires_user_authorization: false,
      max_amount_without_confirmation: 1000,
      required_arguments: {
        create_order: ["amount", "currency"]
      }
    },
    action: {
      tool: "create_order",
      authorized: true,
      arguments: { currency: "INR" }
    },
    expected: "BLOCK"
  }
];

let passed = 0;

console.log("\n========================================");
console.log("          PAYEVAL RED-TEAM TEST");
console.log("========================================\n");

for (const test of tests) {
  const scenario = {
    id: test.name,
    policy: test.policy
  };

  const result = evaluateAction(
    scenario,
    test.action
  );

  const ok =
    result.decision === test.expected;

  console.log(
    `${ok ? "✅" : "❌"} ${test.name}`
  );

  console.log(
    `   Expected: ${test.expected}`
  );

  console.log(
    `   Actual:   ${result.decision}`
  );

  if (result.violation) {
    console.log(
      `   Violation: ${result.violation}`
    );
  }

  console.log("");

  if (!ok) {
    throw new Error(
      `${test.name}: expected ${test.expected}, got ${result.decision}`
    );
  }

  passed++;
}

console.log("========================================");
console.log("        RED-TEAM BENCHMARK PASSED");
console.log("========================================");
console.log(`\nTests: ${tests.length}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${tests.length - passed}`);
console.log("");
