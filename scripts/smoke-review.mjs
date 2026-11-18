/**
 * Smoke test for the /review command handler (no test runner in this
 * workspace, so this script is the suite). Exits non-zero on failure.
 */
import { apply } from "../dsh-command-review/index.js";

let handler;
let lastSpec = null;
const ctx = {
  commands: {
    register: def => {
      handler = def.handler;
    },
  },
  subagents: {
    startActivation: async spec => {
      lastSpec = spec;
      return { name: "agent-9" };
    },
  },
};
apply(ctx);

const signal = new AbortController().signal;
const run = async raw => {
  lastSpec = null;
  const res = await handler({ rawInput: raw, agent: {}, attachments: [], signal });
  return { res, spec: lastSpec };
};

const cases = [
  // [input, expectedKind, expectedTextSnippet]
  [" --model", "error", "Invalid --model/--provider"],
  [" doc.md --output", "error", "--output requires a file path"],
  [" --model= doc.md", "error", "Invalid --model/--provider"],
  [" --effort", "error", "--effort requires"],
  [" --bogus doc.md", "error", "Unknown flag"],
  [" --provider A --model B/C doc", "error", "conflicts"],
  [" --PROVIDER p doc.md", "error", "Unknown flag"],
  [" doc.md", "success", "agent-9"],
  [" --model P/M doc.md", "success", "P/M"],
  [" --provider P doc.md", "success", "provider P (current model)"],
  [" --output r.md doc.md", "success", "r.md"],
  [" -- -weird.md", "success", "-weird.md"],
];

let failures = 0;
for (const [input, kind, needle] of cases) {
  const { res } = await run(input);
  if (res.kind !== kind || !(res.text ?? "").includes(needle)) {
    failures++;
    console.error(
      `FAIL ${JSON.stringify(input)} => ${res.kind}: ${(res.text ?? "").split("\n")[0]}`,
    );
  }
}

// Route inheritance: no flags means no agentOptions key at all.
const inherited = await run(" doc.md");
if ("agentOptions" in inherited.spec) {
  failures++;
  console.error("FAIL route inheritance: agentOptions present without flags");
}

if (failures > 0) {
  console.error(`${failures} failure(s)`);
  process.exit(1);
}
console.log(`ALL PASS (${cases.length + 1} checks)`);
