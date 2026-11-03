#!/usr/bin/env node
// Fails when a path routed from the root AGENTS.md Task Router does not exist, when a
// unit AGENTS.md is not routed from it, or when an AGENTS.md exceeds its line budget.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");
const ROOT_BUDGET = 150;
const UNIT_BUDGET = 120;
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "coverage",
  "storybook-static",
  // Installed third-party skills ship their own instruction files.
  ".agents",
  ".claude",
]);

function findAgentsFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return SKIP_DIRS.has(entry.name) ? [] : findAgentsFiles(full);
    return entry.name === "AGENTS.md" ? [full] : [];
  });
}

function routedPaths(rootText) {
  const section = rootText.split(/^## Task Router\s*$/m)[1];
  if (section === undefined) return null;
  const rows = section
    .split(/^## /m)[0]
    .split("\n")
    .filter((line) => line.startsWith("|") && !/^\|\s*(Task|-+)\s*\|/.test(line));
  return rows.flatMap((row) => {
    const read = row.split("|").at(-2) ?? "";
    return [...read.matchAll(/`([^`]+)`/g)].map((match) => match[1]);
  });
}

const errors = [];
const rootFile = path.join(root, "AGENTS.md");
const rootText = readFileSync(rootFile, "utf8");
const routes = routedPaths(rootText);

if (routes === null || routes.length === 0) {
  errors.push("AGENTS.md: no `## Task Router` table with routed paths");
} else {
  for (const route of routes) {
    if (!existsSync(path.join(root, route)))
      errors.push(`AGENTS.md routes to missing path: ${route}`);
  }
}

for (const file of findAgentsFiles(root)) {
  const rel = path.relative(root, file);
  const lines = readFileSync(file, "utf8").split("\n").length - 1;
  const budget = file === rootFile ? ROOT_BUDGET : UNIT_BUDGET;
  if (lines > budget) errors.push(`${rel}: ${lines} lines, budget ${budget}`);
  if (file !== rootFile && routes !== null && !routes.includes(rel)) {
    errors.push(`${rel} is not routed from the root Task Router`);
  }
}

if (errors.length > 0) {
  for (const error of errors) console.error(`✗ ${error}`);
  process.exit(1);
}
process.stdout.write(
  `✓ ${routes.length} routed paths exist; every AGENTS.md is routed and within budget\n`,
);
