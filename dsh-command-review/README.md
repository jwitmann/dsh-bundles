# Review command

Adds `/review` to dsh-tui.

```text
/review [--model provider/model | model] [--effort <effort>] [--output <file>] <doc-path> [-- extra instructions]
```

Examples:

```text
/review docs/thisdocument.md
/review --model opencode-go/kimi-k3.1-pro docs/thisdocument.md -- focus on clarity
/review --model opencode-go/kimi-k3.1-pro --output docs/thisdocument.review.md docs/thisdocument.md -- focus on clarity
```

Behaviour:

- Starts a `spawn` subagent whose prompt tells it to read the document with its filesystem tools and write a review document.
- Omitting `--model` inherits the current session route (current provider/model/effort).
- `--model provider/model` overrides both; `--model <model-id>` keeps the current provider and overrides only the model.
- Returns immediately with `Started subagent <name>`; the child's completion notice delivers the result to the parent session.
