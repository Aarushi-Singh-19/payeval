const { evaluateAction } = require("./policy-engine");
const { createExecutionTrace } = require("./execution-trace");
const { evaluateIntent } = require("./intent-firewall");
const {
  createTransactionPassport,
  verifyTransactionPassport
} = require("./transaction-passport");

const {
  createActionLineage,
  attachPassport,
  recordDecision,
  recordExecution,
  recordSecurityEvent,
  summarizeLineage
} = require("./action-lineage");

/**
 * Enforce PAYEVAL security policy before allowing an MCP tool invocation.
 *
 * Security order:
 *
 * 1. Intent verification
 * 2. Policy evaluation
 * 3. Human approval, when required
 * 4. Transaction Passport creation / verification
 * 5. MCP connection
 * 6. MCP execution
 *
 * The Transaction Passport binds the final executable action to:
 * - user intent
 * - active policy
 * - exact authorized action
 *
 * If any of these change before execution, PAYEVAL blocks the action.
 */
async function enforceAction(
  scenario,
  actualAction,
  mcpClientOrFactory,
  approvalHandler = null,
  transactionPassport = null
) {
  const startedAt = new Date().toISOString();

  const lineageIntent =
    scenario.intent || {
      tool: actualAction.tool,
      amount: actualAction.arguments?.amount ?? null,
      currency: actualAction.arguments?.currency ?? null,
      target: actualAction.arguments?.receipt ?? null
    };

  const lineage = createActionLineage({
    intent: lineageIntent,
    policy: scenario.policy,
    action: actualAction
  });

  recordSecurityEvent(lineage, "ENFORCEMENT_STARTED", {
    tool: actualAction.tool
  });

  const evaluation = evaluateAction(
    scenario,
    actualAction
  );

  const intentEvaluation =
    scenario.intent
      ? evaluateIntent(
          scenario.intent,
          actualAction
        )
      : null;

  /*
   * ------------------------------------------------------------
   * 1. INTENT VERIFICATION
   * ------------------------------------------------------------
   */

  if (
    intentEvaluation &&
    intentEvaluation.decision === "BLOCK"
  ) {
    const completedAt = new Date().toISOString();

    const intentResult = {
      status: "FAIL",
      decision: "BLOCK",
      reason: intentEvaluation.reason,
      violation: intentEvaluation.violation,
      exposure: evaluation.exposure,
      risk: evaluation.risk
    };

    recordDecision(lineage, {
      decision: "BLOCK",
      violation: intentEvaluation.violation,
      reason: intentEvaluation.reason
    });

    const trace = createExecutionTrace({
      scenario,
      actualAction,
      evaluation: intentResult,
      executionStatus: "BLOCKED",
      executed: false,
      toolSucceeded: false,
      mcpResult: null,
      startedAt,
      completedAt
    });

    return {
      ...intentResult,
      executionStatus: "BLOCKED",
      executed: false,
      toolSucceeded: false,
      mcpResult: null,
      transactionPassport: null,
      lineage,
      lineageSummary: summarizeLineage(lineage),
      trace
    };
  }

  /*
   * ------------------------------------------------------------
   * 2. POLICY BLOCK
   * ------------------------------------------------------------
   */

  if (evaluation.decision === "BLOCK") {
    const completedAt = new Date().toISOString();

    recordDecision(lineage, {
      decision: "BLOCK",
      violation: evaluation.violation,
      reason: evaluation.reason
    });

    const trace = createExecutionTrace({
      scenario,
      actualAction,
      evaluation,
      executionStatus: "BLOCKED",
      executed: false,
      toolSucceeded: false,
      mcpResult: null,
      startedAt,
      completedAt
    });

    return {
      ...evaluation,
      executionStatus: "BLOCKED",
      executed: false,
      toolSucceeded: false,
      mcpResult: null,
      transactionPassport: null,
      lineage,
      lineageSummary: summarizeLineage(lineage),
      trace
    };
  }

  /*
   * ------------------------------------------------------------
   * 3. HUMAN APPROVAL
   * ------------------------------------------------------------
   */

  if (evaluation.decision === "REQUIRE_APPROVAL") {
    if (typeof approvalHandler !== "function") {
      const completedAt = new Date().toISOString();

      const trace = createExecutionTrace({
        scenario,
        actualAction,
        evaluation,
        executionStatus: "APPROVAL_REQUIRED",
        executed: false,
        toolSucceeded: false,
        mcpResult: null,
        startedAt,
        completedAt
      });

      return {
        ...evaluation,
        executionStatus: "APPROVAL_REQUIRED",
        executed: false,
        toolSucceeded: false,
        mcpResult: null,
        transactionPassport: null,
        lineage,
        lineageSummary: summarizeLineage(lineage),
        trace
      };
    }

    const approved = await approvalHandler({
      scenario,
      action: actualAction,
      evaluation
    });

    if (approved !== true) {
      const completedAt = new Date().toISOString();

      const trace = createExecutionTrace({
        scenario,
        actualAction,
        evaluation,
        executionStatus: "APPROVAL_REJECTED",
        executed: false,
        toolSucceeded: false,
        mcpResult: null,
        startedAt,
        completedAt
      });

      return {
        ...evaluation,
        executionStatus: "APPROVAL_REJECTED",
        executed: false,
        toolSucceeded: false,
        mcpResult: null,
        transactionPassport: null,
        lineage,
        lineageSummary: summarizeLineage(lineage),
        trace
      };
    }
  }

  if (
    evaluation.decision !== "ALLOW" &&
    evaluation.decision !== "REQUIRE_APPROVAL"
  ) {
    throw new Error(
      `Invalid PayEval decision: ${evaluation.decision}`
    );
  }

  /*
   * ------------------------------------------------------------
   * 4. TRANSACTION PASSPORT
   * ------------------------------------------------------------
   *
   * A Passport is created only after policy and approval checks.
   *
   * If a caller supplied an existing Passport, it is verified
   * against the CURRENT final action instead.
   */

  let activePassport = transactionPassport;

  if (!activePassport) {
    const passportIntent =
      scenario.intent || {
        tool: actualAction.tool,
        amount: actualAction.arguments?.amount ?? null,
        currency: actualAction.arguments?.currency ?? null,
        target: actualAction.arguments?.receipt ?? null
      };

    activePassport = createTransactionPassport({
      intent: passportIntent,
      policy: scenario.policy,
      action: actualAction
    });

    attachPassport(lineage, activePassport);

    recordSecurityEvent(lineage, "TRANSACTION_PASSPORT_ISSUED", {
      passportId: activePassport.passportId,
      expiresAt: activePassport.expiresAt
    });
  }

  if (transactionPassport) {
    attachPassport(lineage, activePassport);
    recordSecurityEvent(lineage, "TRANSACTION_PASSPORT_PRESENTED", {
      passportId: activePassport.passportId
    });
  }

  const passportIntent =
    scenario.intent || {
      tool: actualAction.tool,
      amount: actualAction.arguments?.amount ?? null,
      currency: actualAction.arguments?.currency ?? null,
      target: actualAction.arguments?.receipt ?? null
    };

const passportVerification =
  verifyTransactionPassport(
    activePassport,
    {
      intent: passportIntent,
      policy: scenario.policy,
      action: actualAction,
      consume: true
    }
  );

  if (!passportVerification.valid) {
    recordSecurityEvent(lineage, "TRANSACTION_PASSPORT_REJECTED", {
      passportId: activePassport.passportId,
      violation: passportVerification.violation,
      reason: passportVerification.reason
    });

    const completedAt = new Date().toISOString();

    const passportResult = {
      status: "FAIL",
      decision: "BLOCK",
      reason: passportVerification.reason,
      violation: passportVerification.violation,
      exposure: evaluation.exposure,
      risk: "CRITICAL"
    };

    const trace = createExecutionTrace({
      scenario,
      actualAction,
      evaluation: passportResult,
      executionStatus: "BLOCKED",
      executed: false,
      toolSucceeded: false,
      mcpResult: null,
      startedAt,
      completedAt
    });

    return {
      ...passportResult,
      executionStatus: "BLOCKED",
      executed: false,
      toolSucceeded: false,
      mcpResult: null,
      transactionPassport: activePassport,
      lineage,
      lineageSummary: summarizeLineage(lineage),
      trace
    };
  }

  recordSecurityEvent(lineage, "TRANSACTION_PASSPORT_VERIFIED", {
    passportId: activePassport.passportId
  });

  recordDecision(lineage, {
    decision: "ALLOW",
    violation: null,
    reason: evaluation.reason || "Action authorized by policy."
  });


  /*
   * ------------------------------------------------------------
   * 5. MCP CONNECTION
   * ------------------------------------------------------------
   */

  let mcpClient;

  try {
    if (typeof mcpClientOrFactory === "function") {
      mcpClient = await mcpClientOrFactory();
    } else {
      mcpClient = mcpClientOrFactory;
    }

    recordSecurityEvent(lineage, "MCP_CONNECTION_ESTABLISHED");
  } catch (error) {
    const completedAt = new Date().toISOString();

    recordExecution(lineage, {
      attempted: false,
      executed: false,
      externalCalls: 0,
      toolSucceeded: false,
      status: "MCP_CONNECTION_FAILURE"
    });

    const trace = createExecutionTrace({
      scenario,
      actualAction,
      evaluation,
      executionStatus: "MCP_CONNECTION_FAILURE",
      executed: false,
      toolSucceeded: false,
      mcpResult: null,
      mcpError: error,
      startedAt,
      completedAt
    });

    return {
      ...evaluation,
      executionStatus: "MCP_CONNECTION_FAILURE",
      executed: false,
      toolSucceeded: false,
      mcpResult: null,
      transactionPassport: activePassport,
      lineage,
      lineageSummary: summarizeLineage(lineage),
      trace
    };
  }

  if (
    !mcpClient ||
    typeof mcpClient.callTool !== "function"
  ) {
    throw new Error(
      "MCP client with callTool() is required for allowed actions."
    );
  }

  /*
   * ------------------------------------------------------------
   * 6. FINAL EXECUTION
   * ------------------------------------------------------------
   */

  const mcpResult = await mcpClient.callTool({
    name: actualAction.tool,
    arguments: actualAction.arguments
  });

  const toolSucceeded =
    mcpResult?.isError !== true;

  const executionStatus =
    toolSucceeded
      ? "EXECUTED_SUCCESS"
      : "EXECUTED_FAILURE";

  recordExecution(lineage, {
    attempted: true,
    executed: true,
    externalCalls: 1,
    toolSucceeded,
    status: executionStatus,
    externalReference:
      mcpResult?.orderId || mcpResult?.order?.id ||
      mcpResult?.id ||
      mcpResult?.order_id ||
      null
  });

  const completedAt = new Date().toISOString();

  const trace = createExecutionTrace({
    scenario,
    actualAction,
    evaluation,
    executionStatus,
    executed: true,
    toolSucceeded,
    mcpResult,
    startedAt,
    completedAt
  });

  return {
    ...evaluation,
    executionStatus,
    executed: true,
    toolSucceeded,
    mcpResult,
    transactionPassport: activePassport,
    lineage,
    lineageSummary: summarizeLineage(lineage),
    trace
  };
}

module.exports = {
  enforceAction
};