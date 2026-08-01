import { readFileSync } from "node:fs";

const reportPath = process.argv[2];
if (!reportPath) {
  console.error("Usage: node check-npm-audit.mjs <npm-audit-json>");
  process.exit(2);
}

const report = JSON.parse(readFileSync(reportPath === "-" ? 0 : reportPath, "utf8"));
const allowedAdvisories = new Map([
  [
    "GHSA-qwww-vcr4-c8h2",
    "React Router RSC advisory has no fixed release in the current registry; this client-only app does not use RSC/SSR.",
  ],
]);
const unexpected = new Map();
const allowed = new Map();

for (const vulnerability of Object.values(report.vulnerabilities ?? {})) {
  if (!["high", "critical"].includes(vulnerability.severity)) continue;
  for (const advisory of vulnerability.via ?? []) {
    if (typeof advisory !== "object" || !advisory.source) continue;
    const id = advisory.url?.match(/advisories\/([^/]+)$/)?.[1] ?? String(advisory.source);
    const target = allowedAdvisories.has(id) ? allowed : unexpected;
    target.set(id, advisory.title ?? vulnerability.name);
  }
}

for (const [id, reason] of allowedAdvisories) {
  if (allowed.has(id)) console.warn(`Allowed high-severity advisory ${id}: ${reason}`);
}

if (unexpected.size > 0) {
  for (const [id, title] of unexpected) console.error(`Unallowlisted high-severity advisory ${id}: ${title}`);
  process.exit(1);
}

console.log("npm audit gate passed: no unallowlisted high/critical advisories.");
