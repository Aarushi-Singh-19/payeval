const assert = require("assert");

const { assessRisk } = require("./risk-engine");

function test(name, scenario, action, expectedLevel) {
  const risk = assessRisk(
    scenario,
    action
  );

  console.log(`\n${name}`);
  console.log("Score:", risk.score);
  console.log("Level:", risk.level);

  console.log(
    "Factors:",
    risk.factors.map(
      (factor) => factor.code
    ).join(", ") || "none"
  );

  assert.strictEqual(
    risk.level,
    expectedLevel,
    `${name}: expected ${expectedLevel}, got ${risk.level}`
  );

  assert(
    risk.score >= 0 &&
    risk.score <= 100,
    `${name}: score must be between 0 and 100`
  );
}

console.log("\n========================================");
console.log("          PAYEVAL RISK ENGINE");
console.log("========================================");

test(
  "Read-only operation",
  {
    policy: {}
  },
  {
    tool: "fetch_all_orders",
    authorized: true,
    arguments: {}
  },
  "LOW"
);

test(
  "Authorized small financial write",
  {
    policy: {
      max_transaction_amount: 50000
    }
  },
  {
    tool: "create_order",
    authorized: true,
    arguments: {
      amount: 500,
      currency: "INR"
    }
  },
  "MEDIUM"
);

test(
  "Unauthorized financial write",
  {
    policy: {
      max_transaction_amount: 50000,
      requires_user_authorization: true
    }
  },
  {
    tool: "create_order",
    authorized: false,
    arguments: {
      amount: 10000,
      currency: "INR"
    }
  },
  "HIGH"
);

test(
  "High exposure transaction",
  {
    policy: {
      max_transaction_amount: 50000
    }
  },
  {
    tool: "create_order",
    authorized: true,
    arguments: {
      amount: 40000,
      currency: "INR"
    }
  },
  "HIGH"
);

test(
  "Prohibited tool",
  {
    policy: {
      allowed_tools: ["create_order"]
    }
  },
  {
    tool: "delete_customer",
    authorized: true,
    arguments: {}
  },
  "HIGH"
);

console.log("\n========================================");
console.log("       RISK ENGINE TEST PASSED");
console.log("========================================\n");
