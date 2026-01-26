# Antara

**"antara" (अन्तर)** - Sanskrit for interval, space, gap

Track life's rhythms: recurring patterns with temporal goals.

## Domain

See `.knowledge/domain/core.yaml` for the full domain model.

**Core concepts:** Rhythm (when) → Activity (what) → History (events) → Progress (computed)

**Rhythm variants:** trailing (rolling window), recurring (resets on completion), calendar (fixed periods)

**Activity framing:** task (maintenance, instances only) vs pursuit (growth, instances or duration)

---

# Claude Code Guidelines

## After Making Changes

After completing a set of code changes, run Biome to lint and format:

```bash
deno task biome
```

This runs both linting and formatting with auto-fix enabled.

## Available Commands

- `deno task lint` - Run linter only
- `deno task fmt` - Format files (with write)
- `deno task fmt:check` - Check formatting without writing
- `deno task biome` - Run full check (lint + format) with auto-fix

## Project Structure

- `src/lib/` - Core library (pure functions, business logic)
- `src/db/` - Database schema and connections
- `src/cli/` - CLI commands and interactive flows
- `src/types.ts` - Domain enums and types

## Testing

```bash
deno task test
```

## Type Checking

```bash
deno task check
```

## Database Migrations

After modifying `src/db/schema.ts`, generate migrations with:

```bash
deno task db:generate
```

**Important:** Drizzle only runs migrations where the `when` timestamp in `drizzle/meta/_journal.json` is greater than the last applied migration. Migrations with older timestamps are silently skipped.
