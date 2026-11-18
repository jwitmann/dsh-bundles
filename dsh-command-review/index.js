/**
 * @module @local/dsh-command-review
 *
 * Human-facing `/review` slash command: delegates document review to a
 * `spawn` subagent. Omitting `--model` inherits the parent's current route;
 * supplying it overrides the child route.
 */

export const name = "command-review";

/** Requires the command registry and the subagent seam. */
export const inject = ["commands", "subagents"];

const USAGE =
  "Usage: /review [--model provider/model | model] [--effort <effort>] [--output <file>] <doc-path> [-- extra instructions]";

/**
 * Remove one `--flag value` / `--flag=value` occurrence from argv.
 * A present-but-valueless flag is consumed and yields "" (so callers can
 * report a usage error instead of mistaking the flag for a positional).
 * @param {string[]} argv mutable token list.
 * @param {string[]} names flag names without dashes.
 * @returns {string|undefined} the flag value, "" when valueless, or undefined when absent.
 */
function takeFlag(argv, names) {
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    for (const flag of names) {
      if (token === `--${flag}`) {
        const value = argv[i + 1];
        if (value === undefined || value.startsWith("-")) {
          argv.splice(i, 1);
          return "";
        }
        argv.splice(i, 2);
        return value;
      }
      if (token.startsWith(`--${flag}=`)) {
        const value = token.slice(flag.length + 3);
        argv.splice(i, 1);
        return value;
      }
    }
  }
  return undefined;
}

/**
 * Split a command line into shell-like tokens, honouring single/double quotes.
 * @param {string} input raw input.
 * @returns {string[]} tokens.
 */
function tokenize(input) {
  const tokens = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  for (;;) {
    const match = re.exec(input);
    if (match === null) break;
    tokens.push(match[1] ?? match[2] ?? match[3]);
  }
  return tokens;
}

/**
 * Register `/review` on the composed command registry.
 * @param {import('@deepseek-ai/cordis').Context} ctx plugin context.
 * @returns {() => void} disposer.
 */
export function apply(ctx) {
  return ctx.commands.register({
    name: "review",
    description: "Review a document in a subagent, optionally on another model",
    input: { hint: "[--model provider/model] [--output file] <doc-path> [-- extra instructions]" },
    handler: async invocation => {
      const raw = invocation.rawInput.trim();
      if (raw === "") {
        return { kind: "error", text: `Missing document path.\n${USAGE}` };
      }

      const argv = tokenize(raw);
      const modelFlag = takeFlag(argv, ["model"]);
      const providerFlag = takeFlag(argv, ["provider"]);
      const effortFlag = takeFlag(argv, ["effort"]);
      const outputFlag = takeFlag(argv, ["output"]);

      let providerOverride;
      let modelOverride;
      let modelCarriesProvider = false;
      if (providerFlag !== undefined) providerOverride = providerFlag;
      if (modelFlag !== undefined) {
        if (modelFlag.includes("/")) {
          const [p, ...rest] = modelFlag.split("/");
          providerOverride = p;
          modelOverride = rest.join("/");
          modelCarriesProvider = true;
        } else {
          modelOverride = modelFlag;
        }
      }
      if (
        (providerOverride !== undefined && providerOverride.trim() === "")
        || (modelOverride !== undefined && modelOverride.trim() === "")
      ) {
        return { kind: "error", text: `Invalid --model/--provider value.\n${USAGE}` };
      }
      if (providerFlag !== undefined && providerFlag !== "" && modelCarriesProvider) {
        return {
          kind: "error",
          text: `--provider conflicts with --model provider/model; use one or the other.\n${USAGE}`,
        };
      }
      if (effortFlag !== undefined && effortFlag.trim() === "") {
        return { kind: "error", text: `--effort requires a value.\n${USAGE}` };
      }
      if (outputFlag !== undefined && outputFlag.trim() === "") {
        return { kind: "error", text: `--output requires a file path.\n${USAGE}` };
      }

      if (argv.length === 0) {
        return { kind: "error", text: `Missing document path.\n${USAGE}` };
      }

      // Optional `--` separator between path and free-form instructions.
      // It also shields positional paths starting with "-".
      let separatorUsed = false;
      if (argv[0] === "--") {
        argv.shift();
        separatorUsed = true;
      }
      if (argv.length === 0) {
        return { kind: "error", text: `Missing document path.\n${USAGE}` };
      }

      const docPath = argv.shift();
      if (!separatorUsed && docPath.startsWith("-")) {
        return {
          kind: "error",
          text: `Unknown flag "${docPath}". Use -- to separate the document path from extra instructions.\n${USAGE}`,
        };
      }
      if (argv[0] === "--") argv.shift();
      const extra = argv.join(" ").trim();
      const outputPath = outputFlag === undefined ? `${docPath}.review.md` : outputFlag;

      /** @type {import('@deepseek-ai/dsh-agent').AgentOptions | undefined} */
      let agentOptions;
      if (
        providerOverride !== undefined
        || modelOverride !== undefined
        || effortFlag !== undefined
      ) {
        agentOptions = {
          ...(providerOverride !== undefined ? { provider: providerOverride } : {}),
          ...(modelOverride !== undefined ? { model: modelOverride } : {}),
          ...(effortFlag !== undefined ? { reasoningEffort: effortFlag } : {}),
        };
      }

      const routeDesc =
        providerOverride !== undefined && modelOverride !== undefined
          ? `${providerOverride}/${modelOverride}`
          : modelOverride !== undefined
            ? `model ${modelOverride} (current provider)`
            : providerOverride !== undefined
              ? `provider ${providerOverride} (current model)`
              : "current model";

      const promptText = [
        `Review the document at ${docPath}.`,
        "",
        "Steps:",
        `1. Read ${docPath} with your available filesystem tools. If the path does not exist, report that and stop.`,
        "2. Review it for correctness, clarity, completeness, and actionable issues. Be specific with file/section references.",
        `3. Write the review to ${outputPath}. Create/overwrite it with your write tools.`,
        extra === "" ? "" : `4. Additional instructions from the user: ${extra}`,
        "",
        `Reply with a short summary plus the review file path you wrote (${outputPath}).`,
      ]
        .filter(line => line !== "")
        .join("\n");

      try {
        const activation = await ctx.subagents.startActivation({
          provider: "spawn",
          label: "review",
          parent: invocation.agent,
          prompt: [{ type: "text", text: promptText }],
          ...(agentOptions === undefined ? {} : { agentOptions }),
          signal: invocation.signal,
          delivery: "parent",
        });
        return {
          kind: "success",
          text: `Started subagent ${activation.name} to review ${docPath} with ${routeDesc}. It will write ${outputPath} and report back.`,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { kind: "error", text: `Could not start review subagent: ${message}` };
      }
    },
  });
}

export default { name, inject, apply };
