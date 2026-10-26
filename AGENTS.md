# AGENTS.md

Instructions for AI coding agents. The source of truth is [CLAUDE.md](CLAUDE.md) (stack, architecture,
conventions, commands); the product plan is [docs/PLAN.md](docs/PLAN.md).

Checklist before each commit:

1. Review the diff: no duplicated logic, files < ~300 lines, functions < ~40 lines.
2. `npm run format` and `npm run check` pass.
3. Update `CLAUDE.md` (architecture/status) and `README.md` (usage) to match the change.
4. Small commits, one feature each.
