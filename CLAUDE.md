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
