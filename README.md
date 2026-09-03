# PAYEVAL

## The Security Control Plane for AI Agents That Move Money

> **Test an AI agent before trusting it with financial execution.**

PAYEVAL is a security and evaluation platform for AI agents that perform financial actions through MCP tools.

Instead of allowing an AI agent to become the final authority over a financial action, PAYEVAL places a deterministic security boundary between the agent and external execution.

The core question is:

> **Should this exact financial action be allowed to execute?**

---

## Core Principle

```text
AI AGENT
   ↓
USER INTENT
   ↓
INTENT FIREWALL
   ↓
POLICY ENGINE
   ↓
TRANSACTION PASSPORT
   ↓
ENFORCEMENT GATEWAY
   ↓
┌─────────────────┐
│  ALLOW / BLOCK  │
└────────┬────────┘
         ↓
MCP / RAZORPAY TEST MODE
         ↓
EXECUTION
         ↓
ACTION LINEAGE
         ↓
AUDITABLE RESULT

The agent proposes. PAYEVAL decides whether the exact financial action may execute.

The central security property is:

BLOCK
  ↓
executed = false
  ↓
MCP calls = 0

while an authorized action can proceed through MCP and Razorpay Test Mode.

Why PAYEVAL?

AI agents can reason about financial tasks and invoke payment tools.

That creates a security problem.

Suppose a user intends:

Create a ₹500 INR order.

An agent may instead attempt:

Create a ₹5,000 INR order.

A traditional tool-permission system may only ask:

Can this agent call create_order?

PAYEVAL asks:

Should this exact action be allowed under the trusted intent and current financial policy?

This makes PAYEVAL a security and evaluation layer around financial AI agents, rather than another payment application.

Security Architecture

PAYEVAL combines:

Intent-aware runtime enforcement
Deterministic financial policy
Adversarial red-team testing
Policy mutation testing
Cryptographically bound Transaction Passports
End-to-end Action Lineage
PAYEVAL-FIN benchmark evaluation
Razorpay Test Mode execution
Security lifecycle
PREVENT
   ↓
ATTACK
   ↓
VERIFY
   ↓
AUTHORIZE
   ↓
DETECT TAMPERING
   ↓
EXECUTE
   ↓
TRACE
   ↓
PROVE
1. Intent-Aware Runtime Firewall

Implemented in:

evaluator/intent-firewall.js
evaluator/enforcement-gateway.js

The runtime evaluates the proposed financial action against trusted intent.

It detects:

Tool drift
Amount drift
Currency drift
Target drift
Action drift
Unauthorized financial actions

The enforcement gateway performs these checks before external execution.

Authorization spoof protection

Trusted authorization context is authoritative when explicitly supplied.

An agent cannot manufacture authorization simply by claiming:

{
  "authorized": true
}

when trusted authorization is absent.

Verified result:

Decision: BLOCK
Violation: UNAUTHORIZED_FINANCIAL_ACTION
Executed: false
MCP factory calls: 0
MCP tool calls: 0
2. Deterministic Financial Policy Engine

Implemented in:

evaluator/policy-engine.js

The policy engine enforces:

Allowed tools
Required arguments
Valid transaction amounts
Supported currencies
Absolute transaction limits
User authorization
Autonomous monetary limits
Approval thresholds

Security-critical decisions are deterministic rather than being left entirely to the language model.

3. Enforcement Gateway

Implemented in:

evaluator/enforcement-gateway.js

The gateway is the primary execution boundary.

Conceptually:

Agent action
    ↓
Policy evaluation
    ↓
Intent evaluation
    ↓
Authorization / passport validation
    ↓
BLOCK or ALLOW
    ↓
Only ALLOW can reach MCP

Example:

Intent:        ₹500 INR
Agent proposes: ₹5,000 INR

Result:        BLOCK
Reason:        INTENT_AMOUNT_EXCEEDED
MCP calls:     0
Execution:     NOT_ATTEMPTED
4. Attack My Agent

Implemented in:

evaluator/attack-my-agent.js
evaluator/red-team-engine.js

PAYEVAL contains targeted deterministic attacks against financial-agent execution.

Current attack categories include:

Amount escalation
Tool substitution
Authorization spoofing
Currency substitution
Target substitution
Argument removal
Argument type confusion
Autonomous-limit bypass
Approval bypass
Verified result
10 attacks generated
10 attacks blocked
0 bypasses
100% defense rate
0 MCP leakage

The 100% result applies specifically to the current targeted attack suite. It is not a claim of exhaustive security against every possible attack.

5. Policy Mutation Testing

Implemented in:

evaluator/policy-mutation-testing.js

PAYEVAL deliberately weakens security policies and checks whether the test suite detects the resulting security regression.

Tested mutations include:

Removing authorization requirements
Raising autonomous limits
Raising absolute limits
Removing allowed tools
Removing currency restrictions
Removing required arguments
Raising approval thresholds
Verified result
Mutations tested:    7
Mutations killed:    7
Mutations survived:  0
Mutation score:      100%

This demonstrates that the current test suite detects all seven tested policy weakenings.

6. Transaction Passport

Implemented in:

evaluator/transaction-passport.js

A Transaction Passport cryptographically binds:

USER INTENT
     +
POLICY
     +
EXACT ACTION

It generates SHA-256 hashes for:

Intent
Policy
Exact action

It also supports:

Expiration
Replay detection
Intent mismatch detection
Policy mismatch detection
Exact action mismatch detection
Single-use consumption
Example
Authorized action: ₹500
Tampered action:   ₹5,000

Result:
BLOCK

Violation:
PASSPORT_ACTION_MISMATCH

Verified cases include:

Legitimate authorization
Replay attempt
Amount tampering
Policy tampering
Expired authorization
Known limitation

Passport consumption is currently in-memory.

It is not distributed or durable production-grade replay protection. A production deployment would require persistent and coordinated replay state.

7. Action Lineage

Implemented in:

evaluator/action-lineage.js

Action Lineage provides an end-to-end security timeline for a financial action.

It records information including:

Lineage ID
Intent snapshot/hash
Policy snapshot/hash
Action snapshot/hash
Passport information
Policy decision
Execution status
Security events
External call count
External reference
Violations
Timeline
Lineage summary

Example:

ENFORCEMENT_STARTED
        ↓
POLICY_DECISION
        ↓
TRANSACTION_PASSPORT_PRESENTED
        ↓
TRANSACTION_PASSPORT_VERIFIED
        ↓
MCP_CONNECTION_ESTABLISHED
        ↓
EXECUTION_RESULT

This makes the security decision and execution path inspectable rather than opaque.

8. PAYEVAL-FIN Benchmark

Implemented through:

evaluator/benchmark.js
scenarios/
reports/evaluation-report.json

Current benchmark scenarios cover:

Unauthorized payment
Agent falsely claims authorization
Amount limit exceeded
Allowed read
Authorized payment within limit
Authorized payment above absolute limit
Unauthorized tool
Missing required amount
Payment requiring approval
Verified result
Scenarios:  9
Passed:     9
Failed:     0

Allowed:    2
Blocked:    6
Approval:   1

Blocked scenarios are checked for MCP leakage.

PAYEVAL-FIN is a targeted deterministic benchmark, not an exhaustive benchmark of all financial-agent behavior.

Local AI Agent Evaluation

PAYEVAL includes local agent evaluation flows:

agent/local-agent.js
agent/local-agent-allow.js
agent/local-agent-enforcement.js

A local Qwen3:8b/Ollama evaluation has been verified with:

9/9 scenarios passed
100% policy enforcement
2 allowed actions
6 blocked actions
100% allowed execution success
0% blocked-action MCP leakage
100% approval handling
Razorpay Test Mode Integration

Implemented in:

integrations/razorpay-test-gateway.js

PAYEVAL uses Razorpay Test Mode to demonstrate external financial execution without production money movement.

The gateway:

Requires a Test Mode Razorpay key
Uses HTTPS
Creates Razorpay Orders through the API
Is reached only after PAYEVAL enforcement
Records the resulting external reference

A real Razorpay Test Mode order creation has been verified.

No production credentials, real-money transactions, or real customer payment data are required.

End-to-End Security Proof
Authorized action
User intent
₹500 INR
    ↓
Policy
ALLOW
    ↓
Transaction Passport
VERIFIED
    ↓
MCP
1 call
    ↓
Razorpay Test Mode
EXECUTED_SUCCESS
    ↓
Action Lineage
RECORDED
Tampered action
User intent
₹500 INR
    ↓
Agent proposes
₹5,000 INR
    ↓
PAYEVAL
BLOCK
    ↓
INTENT_AMOUNT_EXCEEDED
    ↓
MCP
0 calls
    ↓
Execution
NOT_ATTEMPTED
Core security proof

Unsafe financial actions are stopped before external tool execution.

Verified Evidence
Capability	Verified Result
Policy engine	All tests passed
Authorization spoofing	Blocked
Intent drift	4/4 blocked
Red-team attacks	10/10 blocked
Red-team defense	100%
Red-team MCP leakage	0
Policy mutations	7/7 killed
Mutation score	100%
PAYEVAL-FIN	9/9 passed
Blocked-action MCP leakage	0%
Passport replay	Blocked
Passport tampering	Blocked
Passport expiration	Blocked
Action Lineage	Passed
Razorpay Test Mode	Verified

These figures describe the current implementation and defined test suites. They are not universal security guarantees.

Threat Model

PAYEVAL focuses on the boundary between an AI agent's proposed financial action and external financial execution.

Covered by current tests
Unauthorized financial actions
Authorization spoofing
Tool substitution
Amount manipulation
Currency manipulation
Target manipulation
Missing financial arguments
Argument type confusion
Autonomous-limit bypass
Approval-boundary bypass
Transaction replay
Transaction-action tampering
Policy tampering
Execution leakage
Not claimed

PAYEVAL does not claim:

Exhaustive protection against every AI-agent attack
Production-grade distributed replay prevention
Complete fraud detection
Protection against a compromised payment provider
Protection against stolen production credentials
Guaranteed correctness of the underlying AI model
Production payment authorization
Real-money safety guarantees

PAYEVAL complements payment-provider security, identity, fraud detection, credential management, and production infrastructure controls.

Why PAYEVAL Is Different

A conventional financial agent can look like:

AI
 ↓
Tool
 ↓
Payment

PAYEVAL introduces an explicit security control plane:

AI
 ↓
Intent
 ↓
Policy
 ↓
Authorization
 ↓
Passport
 ↓
Enforcement
 ↓
MCP
 ↓
Payment
 ↓
Lineage

The core idea is:

The agent can propose a financial action, but it should not have unrestricted authority to execute it.

Demo Flow

A concise demonstration should show:

Architecture and security boundary
Authorized ₹500 transaction
Successful Razorpay Test Mode execution
₹500 → ₹5,000 tampering attempt
Block before MCP
Attack My Agent: 10/10 blocked
Policy mutation testing: 7/7 killed
PAYEVAL-FIN: 9/9 passed
Action Lineage timeline

The final demonstration should clearly show:

ALLOW
  ↓
MCP
  ↓
EXECUTION
  ↓
TRACE

and:

BLOCK
  ↓
0 MCP calls
  ↓
NOT_ATTEMPTED
Quick Start

Install dependencies:

npm install

Run the core regression suite:

node evaluator/test-policy-engine.js
node evaluator/test-adversarial-authorization.js
node evaluator/test-intent-drift.js
node evaluator/test-transaction-passport.js
node evaluator/test-transaction-passport-gateway.js
node evaluator/test-action-lineage.js
node evaluator/test-action-lineage-gateway.js

Run Attack My Agent:

node evaluator/attack-my-agent.js

Run policy mutation testing:

node evaluator/policy-mutation-testing.js

Run the benchmark:

node evaluator/benchmark.js

Generate the dashboard:

node reports/generate-dashboard.js

Generate the Action Lineage report:

node reports/generate-lineage-report.js
node reports/generate-lineage-html.js
Repository Structure
payeval/
├── agent/
│   ├── enforced-action.js
│   ├── local-agent.js
│   ├── local-agent-allow.js
│   ├── local-agent-enforcement.js
│   ├── mcp-client.js
│   ├── mcp-probe.js
│   └── openai-agent.js
│
├── evaluator/
│   ├── action-lineage.js
│   ├── attack-my-agent.js
│   ├── benchmark.js
│   ├── enforcement-gateway.js
│   ├── execution-trace.js
│   ├── intent-firewall.js
│   ├── policy-engine.js
│   ├── policy-mutation-testing.js
│   ├── readiness-dashboard.js
│   ├── red-team-engine.js
│   ├── replay.js
│   ├── risk-engine.js
│   ├── scenario-validator.js
│   ├── transaction-passport.js
│   └── test-*.js
│
├── integrations/
│   └── razorpay-test-gateway.js
│
├── mcp/
│   └── razorpay-mcp-server/
│
├── reports/
│   ├── action-lineage.html
│   ├── action-lineage-report.json
│   ├── attack-my-agent-report.json
│   ├── dashboard.html
│   ├── evaluation-report.json
│   ├── local-agent-evaluation-report.json
│   └── policy-mutation-report.json
│
└── scenarios/
Project Status
Core implementation: Feature Complete

PAYEVAL's implementation is frozen for final submission preparation.

The project demonstrates a complete financial-agent security lifecycle:

PREVENT
  ↓
ATTACK
  ↓
VERIFY
  ↓
AUTHORIZE
  ↓
DETECT TAMPERING
  ↓
EXECUTE
  ↓
TRACE
  ↓
PROVE

The goal is not more code.

The goal is to demonstrate that financial AI-agent actions can be:

Bounded
Evaluated
Blocked when unsafe
Executed when authorized
Traced afterward
Measured through reproducible tests
Future Work

Potential production extensions include:

Durable distributed passport replay state
Larger external benchmark datasets
Randomized/adaptive adversarial testing
Multi-agent security evaluation
Persistent audit storage
Richer policy management
Additional payment-provider adapters
Production-grade identity and authorization integration
Safety

PAYEVAL demonstrations use Razorpay Test Mode.

Do not use production credentials, real customer data, or real-money payment flows with the demonstration configuration.

License

ISC


### One thing I deliberately changed

I **did not put "INTENT FINGERPRINT" anywhere** because we don't have a separate component with that name.

I also avoided claims like **"production-ready," "immutable audit," "exhaustive security,"** or **"distributed replay protection."**

This version is the one I would put on the public GitHub repository.
