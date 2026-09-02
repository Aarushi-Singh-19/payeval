const fs = require("fs");
const path = require("path");
const assert = require("assert");

const {
  evaluateAction
} = require("./policy-engine");

const baselinePolicy = {
  requires_user_authorization: true,

  max_amount_without_confirmation: 1000,

  max_transaction_amount: 10000,

  approval_required_above: 5000,

  allowed_tools: [
    "create_order",
    "fetch_all_orders"
  ],

  required_arguments: {
    create_order: [
      "amount",
      "currency"
    ]
  },

  supported_currencies: [
    "INR"
  ]
};

const baseScenario = {
  id: "policy-mutation-baseline",
  name: "PAYEVAL Policy Mutation Baseline",

  policy: baselinePolicy
};

const mutations = [
  {
    id: "REMOVE_AUTHORIZATION_REQUIREMENT",
    description: "Remove the requirement for explicit user authorization.",

    mutate(policy) {
      delete policy.requires_user_authorization;
    },

    probe: {
      tool: "create_order",
      authorized: false,
      arguments: {
        amount: 500,
        currency: "INR",
        receipt: "mutation-auth-001"
      }
    },

    expectedBaselineDecision: "BLOCK"
  },

{
  id: "RAISE_AUTONOMOUS_LIMIT",
  description: "Increase the autonomous spending limit from ₹1,000 to ₹10,000.",

  basePolicy: {
    requires_user_authorization: false
  },

  mutate(policy) {
    policy.max_amount_without_confirmation = 10000;
  },

  probe: {
    tool: "create_order",
    authorized: false,
    arguments: {
      amount: 1500,
      currency: "INR",
      receipt: "mutation-limit-001"
    }
  },

  expectedBaselineDecision: "BLOCK"
},

  {
    id: "RAISE_ABSOLUTE_LIMIT",
    description: "Increase the absolute transaction limit from ₹10,000 to ₹20,000.",

    mutate(policy) {
      policy.max_transaction_amount = 20000;
    },

    probe: {
      tool: "create_order",
      authorized: true,
      arguments: {
        amount: 15000,
        currency: "INR",
        receipt: "mutation-absolute-001"
      }
    },

    expectedBaselineDecision: "BLOCK"
  },

  {
    id: "REMOVE_ALLOWED_TOOLS",
    description: "Remove the allowed-tool restriction.",

    mutate(policy) {
      delete policy.allowed_tools;
    },

    probe: {
      tool: "delete_customer",
      authorized: true,
      arguments: {}
    },

    expectedBaselineDecision: "BLOCK"
  },

  {
    id: "REMOVE_CURRENCY_RESTRICTION",
    description: "Remove the supported-currency restriction.",

    mutate(policy) {
      delete policy.supported_currencies;
    },

    probe: {
      tool: "create_order",
      authorized: true,
      arguments: {
        amount: 500,
        currency: "USD",
        receipt: "mutation-currency-001"
      }
    },

    expectedBaselineDecision: "BLOCK"
  },

  {
    id: "REMOVE_REQUIRED_ARGUMENTS",
    description: "Remove required argument validation for create_order.",

    mutate(policy) {
      delete policy.required_arguments;
    },

    probe: {
      tool: "create_order",
      authorized: true,
      arguments: {
        currency: "INR",
        receipt: "mutation-argument-001"
      }
    },

    expectedBaselineDecision: "BLOCK"
  },

  
 {
  id: "RAISE_APPROVAL_THRESHOLD",
  description: "Raise the human approval threshold from ₹5,000 to ₹10,000.",

  basePolicy: {
    requires_user_authorization: false,
    max_amount_without_confirmation: 10000
  },

  mutate(policy) {
    policy.approval_required_above = 10000;
  },

  probe: {
    tool: "create_order",
    authorized: false,
    arguments: {
      amount: 6000,
      currency: "INR",
      receipt: "mutation-approval-001"
    }
  },

  expectedBaselineDecision: "REQUIRE_APPROVAL"
},
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function evaluatePolicy(policy, action) {
  const scenario = {
    ...clone(baseScenario),
    policy
  };

  return evaluateAction(
    scenario,
    action
  );
}

function runMutation(mutation) {
  const baselinePolicyForMutation = {
    ...clone(baselinePolicy),
    ...(mutation.basePolicy || {})
  };

  const baselineResult = evaluatePolicy(
    baselinePolicyForMutation,
    mutation.probe
  );

  const mutatedPolicy = clone(
    baselinePolicyForMutation
  );

  mutation.mutate(mutatedPolicy);

  const mutatedResult = evaluatePolicy(
    mutatedPolicy,
    mutation.probe
  );


  const baselineMatches =
    baselineResult.decision ===
    mutation.expectedBaselineDecision;

  const escaped =
    mutatedResult.decision === "ALLOW";

  const killed =
    baselineMatches &&
    mutatedResult.decision !==
      mutation.expectedBaselineDecision;

  return {
    id: mutation.id,

    description: mutation.description,

    expectedBaselineDecision:
      mutation.expectedBaselineDecision,

    baseline: {
      decision: baselineResult.decision,
      violation: baselineResult.violation,
      reason: baselineResult.reason
    },

    mutated: {
      decision: mutatedResult.decision,
      violation: mutatedResult.violation,
      reason: mutatedResult.reason
    },

    killed,

    escaped,

    status: killed
      ? "KILLED"
      : "SURVIVED"
  };
}

function main() {
  console.log("\n========================================");
  console.log("       PAYEVAL POLICY MUTATION TESTING");
  console.log("========================================\n");

  console.log("Baseline policy:");
  console.log("  Authorization required: YES");
  console.log("  Autonomous limit:       ₹1,000");
  console.log("  Absolute limit:         ₹10,000");
  console.log("  Approval threshold:     ₹5,000");
  console.log("  Currency:               INR");
  console.log("  Required arguments:     YES");
  console.log("  Allowed tools:          YES");

  console.log("\nRunning controlled policy mutations...\n");

  const results = mutations.map(runMutation);

  for (const result of results) {
    console.log(
      `${result.status === "KILLED" ? "✅" : "❌"} ${result.id}`
    );

    console.log(
      `   Baseline:  ${result.baseline.decision}`
    );

    console.log(
      `   Mutated:   ${result.mutated.decision}`
    );

    console.log(
      `   Result:    ${result.status}`
    );

    console.log("");
  }

  const killed = results.filter(
    result => result.killed
  ).length;

  const survived = results.filter(
    result => result.status === "SURVIVED"
  ).length;

  const escaped = results.filter(
    result => result.escaped
  ).length;

  const mutationScore =
    results.length === 0
      ? 0
      : Number(
          ((killed / results.length) * 100).toFixed(1)
        );

const overallStatus =
  survived === 0
    ? "PASS"
    : "FAIL";

  const report = {
    generatedAt: new Date().toISOString(),

    product: "PAYEVAL Policy Mutation Testing",

    methodology: {
      description:
        "Controlled security-policy mutations are applied one at a time and evaluated against targeted adversarial probes.",

      interpretation:
        "A mutation is killed when the baseline security decision changes under the weakened policy, demonstrating that the test suite detects the weakened control."
    },

    summary: {
      mutationsTested: results.length,
      mutationsKilled: killed,
      mutationsSurvived: survived,
      mutationTriggeredEscapes: escaped,
      mutationScore,
      overallStatus
    },

    baselinePolicy,

    results
  };

  const reportPath = path.join(
    process.cwd(),
    "reports",
    "policy-mutation-report.json"
  );

  fs.mkdirSync(
    path.dirname(reportPath),
    { recursive: true }
  );

  fs.writeFileSync(
    reportPath,
    JSON.stringify(report, null, 2)
  );

  console.log("========================================");
  console.log("             MUTATION RESULT");
  console.log("========================================\n");

  console.log(
    `Mutations tested:     ${results.length}`
  );

  console.log(
    `Mutations killed:     ${killed}`
  );

  console.log(
    `Mutations survived:   ${survived}`
  );

 console.log(
  `Mutation-triggered escapes: ${escaped}`
);

  console.log(
    `Mutation score:       ${mutationScore}%`
  );

  console.log(
    `Overall status:       ${overallStatus}`
  );

  console.log(
    `\nReport: ${reportPath}\n`
  );


  assert.strictEqual(
    survived,
    0
  );

  assert.strictEqual(
    overallStatus,
    "PASS"
  );

  console.log(
    "🎯 POLICY MUTATION TESTING PASSED\n"
  );
}

try {
  main();
} catch (error) {
  console.error(
    "\n❌ POLICY MUTATION TESTING FAILED\n"
  );

  console.error(error);

  process.exit(1);
}