const fs = require("fs");
const path = require("path");
const { enforceAction } = require("../evaluator/enforcement-gateway");
const { createTransactionPassport } = require("../evaluator/transaction-passport");

const outputPath = path.join(__dirname, "action-lineage-report.json");

const scenario = {
  id: "action-lineage-demo",
  intent: {
    tool: "create_order",
    amount: 500,
    currency: "INR",
    target: "cust_demo"
  },
  policy: {
    requires_user_authorization: true,
    max_amount_without_confirmation: 1000,
    max_transaction_amount: 10000,
    supported_currencies: ["INR"],
    allowed_tools: ["create_order"],
    required_arguments: {
      create_order: ["amount", "currency"]
    }
  },
  trusted_context: {
    user_authorized: true
  }
};

function fakeMcpClient() {
  return {
    async callTool({ name, arguments: args }) {
      return {
        isError: false,
        order: {
          id: "order_lineage_demo",
          tool: name,
          amount: args.amount,
          currency: args.currency
        }
      };
    }
  };
}

async function run() {
  const authorizedAction = {
    tool: "create_order",
    authorized: true,
    arguments: {
      amount: 500,
      currency: "INR",
      receipt: "cust_demo"
    }
  };

  const passport = createTransactionPassport({
    intent: scenario.intent,
    policy: scenario.policy,
    action: authorizedAction
  });

  const allowed = await enforceAction(
    scenario,
    authorizedAction,
    fakeMcpClient(),
    null,
    passport
  );

  const tamperedAction = {
    ...authorizedAction,
    arguments: {
      ...authorizedAction.arguments,
      amount: 5000
    }
  };

  const blocked = await enforceAction(
    scenario,
    tamperedAction,
    fakeMcpClient(),
    null,
    null
  );

  const report = {
    reportVersion: "1.0",
    generatedAt: new Date().toISOString(),
    title: "PAYEVAL Transaction Security Timeline",
    authorized: {
      lineage: allowed.lineage,
      summary: allowed.lineageSummary
    },
    tampered: {
      lineage: blocked.lineage,
      summary: blocked.lineageSummary
    }
  };

  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

  console.log("");
  console.log("========================================");
  console.log("   PAYEVAL LINEAGE REPORT GENERATED");
  console.log("========================================");
  console.log("");
  console.log("Authorized:");
  console.log("  Decision:       ", allowed.decision);
  console.log("  Execution:      ", allowed.executionStatus);
  console.log("  Passport:       ", allowed.lineage?.passport?.passportId);
  console.log("  External ref:   ", allowed.lineage?.execution?.externalReference);
  console.log("");
  console.log("Tampered:");
  console.log("  Decision:       ", blocked.decision);
  console.log("  Violation:      ", blocked.violation);
  console.log("  External calls: ", blocked.lineage?.execution?.externalCalls);
  console.log("");
  console.log(`Report: ${outputPath}`);
  console.log("");
}

run().catch(error => {
  console.error("❌ LINEAGE REPORT FAILED");
  console.error(error);
  process.exit(1);
});
