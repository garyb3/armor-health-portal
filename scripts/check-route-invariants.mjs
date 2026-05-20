#!/usr/bin/env node
/**
 * Static API-route invariant checker.
 *
 * Enforces, per exported HTTP handler in src/app/api/ ** /route.ts:
 *   (a) auditLog.create must be inside a $transaction if the handler has one
 *   (b) write handlers that parseJsonBody must enforceMaxBodySize first
 *   (c) no raw <request>.json() (must use parseJsonBody)
 *   (d) write handlers must call rateLimit
 *   (e) auditLog.create data must include countyId when county is in scope
 *   (f) applicant.update with data.denied=true must purge SensitiveData
 *   (g) outside-tx reads of archivedAt/offerAcceptedAt/denied need a matching
 *       inside-tx read when the handler uses $transaction(async (tx) => …)
 *
 * Why this exists: every route hand-rolls the same security/audit ceremony with
 * no shared wrapper and there was no automated gate, so the same bug classes
 * recurred every audit. This makes a violation fail `npm test`, the pre-commit
 * hook, and CI — the instant it is introduced.
 *
 * Per-line opt-out: `// invariant-ignore: <reason>` on the violation line or the
 * line directly above. A missing/empty reason is itself a violation.
 *
 * Modes:
 *   (default)   exit 1 if any unsuppressed violation, else 0
 *   --report    print everything incl. suppressed + unverifiable, always exit 0
 *
 * No deps beyond the already-present `typescript`. Runs on plain `node`.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const API_DIR = join(ROOT, "src", "app", "api");
const REPORT = process.argv.includes("--report");

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const ALL_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);

/** Recursively collect every route.ts under src/app/api. */
function findRouteFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...findRouteFiles(p));
    else if (entry === "route.ts" || entry === "route.tsx") out.push(p);
  }
  return out;
}

/** All descendant nodes of `root` (inclusive). */
function descendants(root) {
  const acc = [];
  const visit = (n) => {
    acc.push(n);
    ts.forEachChild(n, visit);
  };
  visit(root);
  return acc;
}

function isInside(node, ancestor) {
  for (let p = node.parent; p; p = p.parent) {
    if (p === ancestor) return true;
  }
  return false;
}

/** CallExpression on a bare identifier: `name(...)`. */
function isHelperCall(node, name) {
  return (
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === name
  );
}

/** CallExpression whose callee property is `prop`: `x.prop(...)`. */
function isMemberCall(node, prop) {
  return (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    node.expression.name.text === prop
  );
}

/** CallExpression matching `*.auditLog.create(...)`. */
function isAuditLogCreate(node) {
  if (!ts.isCallExpression(node)) return false;
  const e = node.expression;
  return (
    ts.isPropertyAccessExpression(e) &&
    e.name.text === "create" &&
    ts.isPropertyAccessExpression(e.expression) &&
    e.expression.name.text === "auditLog"
  );
}

function propKeyName(prop) {
  if (ts.isPropertyAssignment(prop) || ts.isShorthandPropertyAssignment(prop)) {
    const n = prop.name;
    if (ts.isIdentifier(n)) return n.text;
    if (ts.isStringLiteral(n)) return n.text;
  }
  return null;
}

/** Exported handlers in a source file: [{ method, fnNode }]. */
function findHandlers(sf) {
  const handlers = [];
  for (const stmt of sf.statements) {
    const mods = ts.canHaveModifiers(stmt) ? ts.getModifiers(stmt) : undefined;
    const exported = mods?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    if (!exported) continue;

    if (ts.isFunctionDeclaration(stmt) && stmt.name && ALL_METHODS.has(stmt.name.text)) {
      handlers.push({ method: stmt.name.text, fnNode: stmt });
    } else if (ts.isVariableStatement(stmt)) {
      for (const d of stmt.declarationList.declarations) {
        if (ts.isIdentifier(d.name) && ALL_METHODS.has(d.name.text) && d.initializer) {
          handlers.push({ method: d.name.text, fnNode: d.initializer });
        }
      }
    }
  }
  return handlers;
}

/** firstParam identifier name of a function-ish node, or null. */
function firstParamName(fnNode) {
  const params = fnNode.parameters;
  if (!params || params.length === 0) return null;
  const p = params[0].name;
  return ts.isIdentifier(p) ? p.text : null;
}

/** Build map: 1-based line -> { reason } for `// invariant-ignore:` markers. */
function ignoreMap(lines) {
  const m = new Map();
  lines.forEach((text, i) => {
    const idx = text.indexOf("invariant-ignore:");
    if (idx !== -1) {
      m.set(i + 1, { reason: text.slice(idx + "invariant-ignore:".length).trim() });
    }
  });
  return m;
}

const violations = []; // { file, line, col, method, code, message }
const suppressed = [];
const unverifiable = [];

for (const file of findRouteFiles(API_DIR)) {
  const src = readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, /*setParentNodes*/ true);
  const rel = relative(ROOT, file).split(sep).join("/");
  const lines = src.split(/\r?\n/);
  const ignores = ignoreMap(lines);

  for (const { method, fnNode } of findHandlers(sf)) {
    const nodes = descendants(fnNode);
    const isWrite = WRITE_METHODS.has(method);

    const txCalls = nodes.filter((n) => isMemberCall(n, "$transaction"));
    const auditCreates = nodes.filter(isAuditLogCreate);
    const parseJsonCalls = nodes.filter((n) => isHelperCall(n, "parseJsonBody"));
    const maxBodyCalls = nodes.filter((n) => isHelperCall(n, "enforceMaxBodySize"));
    const hasRateLimit = nodes.some((n) => isHelperCall(n, "rateLimit"));
    const countyInScope =
      nodes.some((n) => isHelperCall(n, "requireCountyAccess")) ||
      nodes.some((n) => isHelperCall(n, "assertApplicantInCounty"));
    const reqName = firstParamName(fnNode);

    const at = (node) => {
      const { line, character } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
      return { line: line + 1, col: character + 1 };
    };
    const record = (node, code, message) => {
      const { line, col } = at(node);
      const ig = ignores.get(line) || ignores.get(line - 1);
      const row = { file: rel, line, col, method, code, message };
      if (ig) {
        if (ig.reason) {
          suppressed.push({ ...row, reason: ig.reason });
          return;
        }
        violations.push({ ...row, code: "OPT-OUT", message: "invariant-ignore requires a non-empty reason" });
        return;
      }
      violations.push(row);
    };

    // (a) auditLog.create outside an existing $transaction
    if (txCalls.length > 0) {
      for (const ac of auditCreates) {
        if (!txCalls.some((tx) => isInside(ac, tx))) {
          record(ac, "a", "auditLog.create is outside the handler's $transaction (crash between commit and log drops the audit row)");
        }
      }
    }

    // (b) write handler parseJsonBody without prior enforceMaxBodySize
    if (isWrite && parseJsonCalls.length > 0) {
      if (maxBodyCalls.length === 0) {
        record(parseJsonCalls[0], "b", "write handler calls parseJsonBody without enforceMaxBodySize");
      } else {
        const firstParse = Math.min(...parseJsonCalls.map((n) => n.getStart(sf)));
        const hasEarlier = maxBodyCalls.some((n) => n.getStart(sf) < firstParse);
        if (!hasEarlier) {
          record(parseJsonCalls[0], "b", "enforceMaxBodySize appears after parseJsonBody (must be before)");
        }
      }
    }

    // (c) raw <request>.json()
    if (reqName) {
      for (const n of nodes) {
        if (
          ts.isCallExpression(n) &&
          n.arguments.length === 0 &&
          ts.isPropertyAccessExpression(n.expression) &&
          n.expression.name.text === "json" &&
          ts.isIdentifier(n.expression.expression) &&
          n.expression.expression.text === reqName
        ) {
          record(n, "c", `raw ${reqName}.json() — use parseJsonBody instead`);
        }
      }
    }

    // (d) write handler missing rateLimit
    if (isWrite && !hasRateLimit) {
      record(fnNode, "d", `${method} handler has no rateLimit() call`);
    }

    // (e) auditLog.create data missing countyId when county in scope
    if (countyInScope) {
      for (const ac of auditCreates) {
        const arg0 = ac.arguments[0];
        if (!arg0 || !ts.isObjectLiteralExpression(arg0)) {
          unverifiable.push({ file: rel, ...at(ac), method, code: "e", message: "auditLog.create arg not an inline object literal — cannot verify countyId" });
          continue;
        }
        const dataProp = arg0.properties.find((p) => propKeyName(p) === "data");
        if (!dataProp || !ts.isPropertyAssignment(dataProp) || !ts.isObjectLiteralExpression(dataProp.initializer)) {
          unverifiable.push({ file: rel, ...at(ac), method, code: "e", message: "auditLog.create data is not an inline object literal — cannot verify countyId" });
          continue;
        }
        const dataObj = dataProp.initializer;
        const hasSpread = dataObj.properties.some((p) => ts.isSpreadAssignment(p));
        const hasCountyId = dataObj.properties.some((p) => propKeyName(p) === "countyId");
        if (hasCountyId) continue;
        if (hasSpread) {
          unverifiable.push({ file: rel, ...at(ac), method, code: "e", message: "auditLog.create data has a spread — cannot verify countyId" });
          continue;
        }
        record(ac, "e", "auditLog.create data is missing countyId (county is in scope via requireCountyAccess/assertApplicantInCounty)");
      }
    }

    // (f) applicant.update with data.denied=true must purge SensitiveData.
    // G7 / G7-sibling regression class: the deny/delete/remove routes all
    // need to drop the encrypted SSN row when marking a candidate denied.
    const applicantUpdates = nodes.filter((n) => {
      if (!ts.isCallExpression(n)) return false;
      const e = n.expression;
      return (
        ts.isPropertyAccessExpression(e) &&
        (e.name.text === "update" || e.name.text === "updateMany") &&
        ts.isPropertyAccessExpression(e.expression) &&
        e.expression.name.text === "applicant"
      );
    });
    const hasSensitivePurge = nodes.some((n) => {
      if (!ts.isCallExpression(n)) return false;
      const e = n.expression;
      return (
        ts.isPropertyAccessExpression(e) &&
        e.name.text === "deleteMany" &&
        ts.isPropertyAccessExpression(e.expression) &&
        e.expression.name.text === "sensitiveData"
      );
    });
    for (const au of applicantUpdates) {
      const arg0 = au.arguments[0];
      if (!arg0 || !ts.isObjectLiteralExpression(arg0)) continue;
      const dataProp = arg0.properties.find((p) => propKeyName(p) === "data");
      if (!dataProp || !ts.isPropertyAssignment(dataProp) || !ts.isObjectLiteralExpression(dataProp.initializer)) {
        // data is dynamic — too noisy to flag, but worth surfacing
        const hasDeniedKey = nodes.some((n) =>
          ts.isPropertyAssignment(n) &&
          propKeyName(n) === "denied" &&
          n.initializer.kind === ts.SyntaxKind.TrueKeyword
        );
        if (hasDeniedKey && !hasSensitivePurge) {
          unverifiable.push({ file: rel, ...at(au), method, code: "f", message: "applicant.update data is dynamic but handler has a literal `denied: true` somewhere and no sensitiveData.deleteMany — manual review" });
        }
        continue;
      }
      const setsDeniedTrue = dataProp.initializer.properties.some(
        (p) => propKeyName(p) === "denied" &&
          ts.isPropertyAssignment(p) &&
          p.initializer.kind === ts.SyntaxKind.TrueKeyword
      );
      if (!setsDeniedTrue) continue;
      if (hasSensitivePurge) continue;
      record(au, "f", "applicant.update sets denied:true but handler has no sensitiveData.deleteMany — SSN must be purged on denial");
    }

    // (g) outside-tx reads of mutable eligibility flags need an inside-tx
    // re-read when the handler uses $transaction(async (tx) => …).
    // H-archive class: read archivedAt/offerAcceptedAt/denied before the tx,
    // then mutate inside — concurrent mutation slips between check and write.
    // Receivers like `body`, `data`, `payload`, `input`, `req`, `request` are
    // request-body parses or Prisma write payloads, not DB record reads.
    const ELIGIBILITY_FLAGS = new Set(["archivedAt", "offerAcceptedAt", "denied"]);
    const NON_DB_RECEIVERS = new Set(["body", "data", "payload", "input", "req", "request"]);
    const callbackTxBodies = txCalls
      .map((tx) => tx.arguments[0])
      .filter((a) => a && (ts.isArrowFunction(a) || ts.isFunctionExpression(a)))
      .map((a) => a.body);
    if (callbackTxBodies.length > 0) {
      const isAssignmentTarget = (access) => {
        const p = access.parent;
        return (
          p &&
          ts.isBinaryExpression(p) &&
          p.left === access &&
          p.operatorToken.kind === ts.SyntaxKind.EqualsToken
        );
      };
      const isNonDbReceiver = (access) => {
        const recv = access.expression;
        return ts.isIdentifier(recv) && NON_DB_RECEIVERS.has(recv.text);
      };
      const flagAccesses = nodes.filter(
        (n) =>
          ts.isPropertyAccessExpression(n) &&
          ELIGIBILITY_FLAGS.has(n.name.text) &&
          !isAssignmentTarget(n) &&
          !isNonDbReceiver(n)
      );
      const insideFlagNames = new Set();
      const outsideAccesses = [];
      for (const access of flagAccesses) {
        const inside = callbackTxBodies.some((body) => isInside(access, body) || access === body);
        if (inside) insideFlagNames.add(access.name.text);
        else outsideAccesses.push(access);
      }
      for (const access of outsideAccesses) {
        if (insideFlagNames.has(access.name.text)) continue;
        record(access, "g", `outside-tx access to .${access.name.text} with no matching inside-tx re-read — TOCTOU race (read inside tx or re-read inside)`);
      }
    }
  }
}

// ---- output ----
const fmt = (v) => `  ${v.file}:${v.line}:${v.col}  [${v.method}] (${v.code}) ${v.message}`;

if (violations.length > 0) {
  console.log(`\n✖ ${violations.length} route-invariant violation(s):\n`);
  for (const v of violations) console.log(fmt(v));
}

if (REPORT) {
  if (suppressed.length > 0) {
    console.log(`\n⊘ ${suppressed.length} suppressed (// invariant-ignore):\n`);
    for (const v of suppressed) console.log(`${fmt(v)}  — reason: ${v.reason}`);
  }
  if (unverifiable.length > 0) {
    console.log(`\n? ${unverifiable.length} unverifiable (manual review):\n`);
    for (const v of unverifiable) console.log(fmt(v));
  }
  console.log(
    `\nReport: ${violations.length} violation(s), ${suppressed.length} suppressed, ${unverifiable.length} unverifiable.`
  );
  process.exit(0);
}

if (violations.length === 0) {
  console.log("✓ route invariants: all handlers pass");
  process.exit(0);
}
console.log(
  `\nFix each, or add \`// invariant-ignore: <reason>\` on/above the line for a reviewed exception.`
);
process.exit(1);
