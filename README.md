# Antara (अन्तर)

> _antara_ (अन्तर) - Sanskrit for interval, space, or gap

Track the rhythms of life—recurring patterns you want to maintain.

## Installation

Requires [Deno](https://deno.land/) v2.0+

```bash
git clone https://github.com/zan/antara.git
cd antara
deno task install
```

This installs `antara` globally. The database is created automatically on first run.

**Data location:**
- macOS/Windows: `~/.antara/db.sqlite`
- Linux: `$XDG_DATA_HOME/antara/db.sqlite` (defaults to `~/.local/share/antara/`)

## Domain

Everything has a **rhythm** (when), a **target** (how much), and a **measurement** (what units).

### Rhythm

Defines _when_ something should happen. Three variants:

| Variant       | Description                        | Example                          |
| ------------- | ---------------------------------- | -------------------------------- |
| **Trailing**  | Sliding window from now            | "5x in the last 7 days"          |
| **Recurring** | Resets from last completion        | "Every 30 days"                  |
| **Calendar**  | Fixed calendar periods             | "3x per week"                    |

### Activity

A recurring pattern you track. Has two framings:

| Framing     | Mindset     | Typical Rhythm | Example                          |
| ----------- | ----------- | -------------- | -------------------------------- |
| **Task**    | Maintenance | Recurring      | Clean bathroom every 30 days     |
| **Pursuit** | Growth      | Any            | Climb 3x per week, drums 150min/week |

### Measurement

How progress is counted:

- **Instances** — Count occurrences (each completion = 1)
- **Duration** — Accumulate minutes

> Tasks always use instances. Pursuits can use either.

### History

Event store for completions. Progress is computed on-demand from events within the rhythm window.

## Usage

```
antara              अन्तर (antara) - the intervals between

Commands:
  antara log        Log a completion or duration for an activity
  antara create     Create a new activity
  antara status     Show progress for all activities

Options:
  -h, --help        Show help
  -V, --version     Show version
```

## Development

```bash
deno install              # Install dependencies
deno task db:generate     # Generate migrations from schema
deno task db:migrate      # Apply migrations

deno task check           # Type check
deno task test            # Run tests
deno task biome           # Lint and format

deno task dev             # Run CLI (dev mode with watch)
deno task cli             # Run CLI
```

## License

MIT
