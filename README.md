# Antara (अन्तर)

> _antara_ (अन्तर) - Sanskrit for interval, space, or gap

Tune the rhythms of life.

## Installation

Requires [Deno](https://deno.land/) v2.0+

```bash
git clone https://github.com/zan/antara.git
cd antara
deno task install
```

This installs `antara` globally via `deno install`. The database is created automatically on first run (`~/.antara/db.sqlite`).

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

### Errands

One-off tasks with no rhythm. Due immediately upon creation. Completed errands remain visible for 3 days, then fade from view.

```bash
antara errand add     # Add a new errand
antara errand         # List errands
antara errand done    # Mark an errand complete
```

Errands also appear in `antara status`.

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
