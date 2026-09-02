const fs = require("fs");
const path = require("path");

const inputPath = path.join(__dirname, "action-lineage-report.json");
const outputPath = path.join(__dirname, "action-lineage.html");

const report = JSON.parse(fs.readFileSync(inputPath, "utf8"));

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function eventRows(lineage, blocked = false) {
  return lineage.events.map((event, index) => {
    const detail = Object.entries(event)
      .filter(([key]) => key !== "timestamp" && key !== "type")
      .map(([key, value]) => `${key}: ${typeof value === "object" ? JSON.stringify(value) : value}`)
      .join(" • ");

    return `
      <div class="event ${blocked ? "danger" : ""}">
        <div class="event-index">${index + 1}</div>
        <div>
          <div class="event-type">${escapeHtml(event.type)}</div>
          <div class="event-time">${escapeHtml(event.timestamp)}</div>
          ${detail ? `<div class="event-detail">${escapeHtml(detail)}</div>` : ""}
        </div>
      </div>
    `;
  }).join("");
}

function timeline(title, lineage, blocked = false) {
  const summary = blocked ? report.tampered.summary : report.authorized.summary;

  return `
    <section class="timeline-card ${blocked ? "blocked" : "allowed"}">
      <div class="timeline-header">
        <div>
          <div class="eyebrow">${blocked ? "SECURITY EVENT" : "AUTHORIZED TRANSACTION"}</div>
          <h2>${escapeHtml(title)}</h2>
        </div>
        <div class="decision ${blocked ? "decision-block" : "decision-allow"}">
          ${escapeHtml(summary.decision)}
        </div>
      </div>

      <div class="chain">
        <span>USER INTENT</span>
        <span>→</span>
        <span>POLICY</span>
        <span>→</span>
        <span>PASSPORT</span>
        <span>→</span>
        <span>EXACT ACTION</span>
        <span>→</span>
        <span>EXECUTION</span>
        <span>→</span>
        <span>RESULT</span>
      </div>

      <div class="events">
        ${eventRows(lineage, blocked)}
      </div>

      <div class="facts">
        <div>
          <span>Lineage ID</span>
          <strong>${escapeHtml(summary.lineageId)}</strong>
        </div>
        <div>
          <span>Passport</span>
          <strong>${escapeHtml(summary.passportId || "None")}</strong>
        </div>
        <div>
          <span>Intent Hash</span>
          <strong>${escapeHtml(summary.intentHash)}</strong>
        </div>
        <div>
          <span>Action Hash</span>
          <strong>${escapeHtml(summary.actionHash)}</strong>
        </div>
        <div>
          <span>External Calls</span>
          <strong>${escapeHtml(summary.externalCalls)}</strong>
        </div>
        <div>
          <span>External Reference</span>
          <strong>${escapeHtml(summary.externalReference || "None")}</strong>
        </div>
        <div>
          <span>Violation</span>
          <strong>${escapeHtml(summary.violation || "None")}</strong>
        </div>
        <div>
          <span>Execution</span>
          <strong>${escapeHtml(summary.executionStatus)}</strong>
        </div>
      </div>
    </section>
  `;
}

const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>PAYEVAL Transaction Security Timeline</title>
<style>
* { box-sizing: border-box; }

body {
  margin: 0;
  font-family: Inter, Arial, sans-serif;
  background: #090d18;
  color: #edf2ff;
}

.container {
  max-width: 1180px;
  margin: auto;
  padding: 48px 24px 64px;
}

.hero {
  background: linear-gradient(135deg, #151c31, #101626);
  border: 1px solid #293552;
  border-radius: 22px;
  padding: 36px;
  margin-bottom: 28px;
}

.eyebrow {
  color: #8d9ab5;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 1.2px;
  text-transform: uppercase;
}

h1 {
  font-size: 42px;
  margin: 10px 0;
}

.hero p {
  color: #aab4c9;
  font-size: 17px;
  max-width: 760px;
  line-height: 1.6;
}

.timeline-card {
  background: #111827;
  border: 1px solid #293552;
  border-radius: 20px;
  padding: 28px;
  margin-top: 24px;
}

.timeline-card.blocked {
  border-color: #63303b;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

h2 {
  margin: 8px 0 0;
  font-size: 25px;
}

.decision {
  padding: 9px 15px;
  border-radius: 999px;
  font-weight: 800;
  font-size: 13px;
}

.decision-allow {
  background: #153d2d;
  color: #62e6a6;
}

.decision-block {
  background: #431f29;
  color: #ff8292;
}

.chain {
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
  align-items: center;
  margin: 28px 0;
  padding: 16px;
  background: #0b1020;
  border-radius: 12px;
  color: #aeb9cf;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .5px;
}

.events {
  position: relative;
  margin: 20px 0 28px;
}

.event {
  display: flex;
  gap: 16px;
  padding: 17px 0;
  border-bottom: 1px solid #222c42;
}

.event:last-child {
  border-bottom: 0;
}

.event-index {
  min-width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #26324c;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 12px;
}

.event.danger .event-index {
  background: #572833;
  color: #ff9aaa;
}

.event-type {
  font-weight: 800;
  font-size: 14px;
}

.event-time {
  color: #707d96;
  font-size: 11px;
  margin-top: 4px;
}

.event-detail {
  color: #9ca9c0;
  font-size: 12px;
  margin-top: 7px;
  word-break: break-word;
}

.facts {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.facts div {
  background: #0b1020;
  border: 1px solid #202b43;
  border-radius: 12px;
  padding: 14px;
  min-width: 0;
}

.facts span {
  display: block;
  color: #77839b;
  font-size: 11px;
  text-transform: uppercase;
  margin-bottom: 7px;
}

.facts strong {
  display: block;
  font-size: 12px;
  word-break: break-all;
}

.footer {
  margin-top: 28px;
  color: #66728a;
  font-size: 12px;
}

@media(max-width:850px) {
  .facts {
    grid-template-columns: repeat(2, 1fr);
  }

  h1 {
    font-size: 32px;
  }
}

@media(max-width:550px) {
  .facts {
    grid-template-columns: 1fr;
  }
}
</style>
</head>
<body>
<div class="container">

<div class="hero">
  <div class="eyebrow">PAYEVAL Security Control Plane</div>
  <h1>Transaction Security Timeline</h1>
  <p>
    Every financial action is traceable from user intent to policy,
    transaction authorization, exact action, external execution, and final result.
  </p>
</div>

${timeline("₹500 Authorized Payment", report.authorized.lineage)}
${timeline("₹500 → ₹5,000 Tampering Attempt", report.tampered.lineage, true)}

<div class="footer">
  Generated by PAYEVAL • Lineage report version ${escapeHtml(report.reportVersion)}
</div>

</div>
</body>
</html>`;

fs.writeFileSync(outputPath, html);

console.log("");
console.log("========================================");
console.log("   PAYEVAL LINEAGE HTML GENERATED");
console.log("========================================");
console.log("");
console.log(`HTML: ${outputPath}`);
console.log("");
