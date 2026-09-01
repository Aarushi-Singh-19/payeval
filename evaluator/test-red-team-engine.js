const assert = require("assert");

const {
  generateAttacks,
  runRedTeam
} = require("./red-team-engine");

async function main() {
  console.log("\n========================================");
  console.log("       PAYEVAL RED-TEAM ENGINE");
  console.log("========================================\n");

const scenario = {
  id: "redteam-payment",
  name: "Payment Security Red-Team",

  trusted_context: {
    user_authorized: true
  },

  intent: {
    tool: "create_order",
    amount: 500,
    currency: "INR",
    target: "redteam-001"
  },

  policy: {
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
    }
  };
const legitimateAction = {
  tool: "create_order",
  authorized: false,

    arguments: {
      amount: 500,
      currency: "INR",
      receipt: "redteam-001"
    }
  };

  const attacks =
    generateAttacks(
      scenario,
      legitimateAction
    );

  console.log(
    `Generated attacks: ${attacks.length}\n`
  );

  for (const attack of attacks) {
    console.log(
      `⚔️  ${attack.category}`
    );

    console.log(
      `    Technique: ${attack.technique}`
    );

    console.log(
      `    ${attack.description}\n`
    );
  }

  const report =
    await runRedTeam(
      scenario,
      legitimateAction
    );

  console.log(
    "\n========================================"
  );

  console.log(
    "             RED-TEAM RESULT"
  );

  console.log(
    "========================================\n"
  );

  console.log(
    JSON.stringify(
      report.summary,
      null,
      2
    )
  );

  console.log("\nATTACK RESULTS");

  for (const result of report.results) {
    console.log(
      `${result.passed ? "✅" : "❌"} ${result.category}`
    );

    console.log(
      `   Decision: ${result.decision}`
    );

    console.log(
      `   Violation: ${result.violation}`
    );

    console.log(
      `   Risk: ${result.risk?.level || "unknown"}`
    );

    console.log(
      `   MCP calls: ${result.mcpFactoryCalls}`
    );
  }

  assert.strictEqual(
    report.summary.mcpLeakageCount,
    0,
    "Red-team attack reached MCP"
  );

  assert.strictEqual(
    report.summary.attacksFailed,
    0,
    "At least one adversarial attack bypassed PAYEVAL"
  );

  assert.strictEqual(
    report.summary.overallStatus,
    "PASS"
  );

  console.log(
    "\n========================================"
  );

  console.log(
    "   RED-TEAM ENGINE TEST PASSED"
  );

  console.log(
    "========================================\n"
  );
}

main().catch((error) => {
  console.error("\n❌ RED-TEAM ENGINE FAILED\n");
  console.error(error);
  process.exit(1);
});
