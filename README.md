# Ananta

> *antara* (अन्तर) - Sanskrit for interval, space, or gap

A CLI/TUI productivity tracker for managing interval-based tasks and accumulation-based pursuits.

## Philosophy

Much of life breaks down into activities that must be performed at intervals or accumulated over time. Ananta helps you track both:

- **Tasks** that need doing every N days/weeks/months
- **Pursuits** where you're accumulating sessions or time toward a goal

## Domain Model

### Core Concepts

| Term | Definition | Examples |
|------|------------|----------|
| **Activity** | Top-level entity for anything you track | Any task or pursuit |
| **Task** | Completion-based activity with an interval | Clean bathroom (1/month), Change oil (every 90 days) |
| **Pursuit** | Accumulation-based activity toward a goal | Climbing 3x/week, Drums 150min/week |
| **Entry** | A logged occurrence of an activity | Completed task, logged session, time spent |
| **Period** | Time window for accumulation goals | `daily`, `weekly`, `monthly`, `yearly` |
| **Mode** | How a pursuit is measured | `sessions` (count) or `duration` (minutes) |

### Activity Types

#### Tasks
- Completion-based (you did it or you didn't)
- Have an **interval** in days
- Track when last completed
- Show days until next due

#### Pursuits
Two modes:

1. **Session Mode** - Count instances
   - Example: Go climbing 3x/week
   - Each entry is just a timestamp
   - Progress: sessions logged vs target

2. **Duration Mode** - Accumulate time
   - Example: Practice drums 150min/week
   - Each entry includes minutes
   - Progress: total minutes vs target

## Usage

### Quick Log (Default)

```bash
ananta
```

Opens interactive prompt:
1. Fuzzy search for activity
2. For tasks: instant log
3. For pursuits:
   - Session mode: instant log
   - Duration mode: prompt for minutes

### Create New Activity

```bash
ananta create
```

Interactive prompts to create a task or pursuit with interval/target configuration.

### View Status

```bash
ananta status
```

Shows all activities with current progress:
- Tasks: days until due / overdue
- Pursuits: progress bar toward period target

## Architecture

### Layer Separation

```
CLI Layer (src/cli/)           - Terminal UI, prompts, commands
    ↓
Core Library (src/lib/)        - Pure functions, business logic
    ↓
Database Layer (src/db/)       - Schema, connections, migrations
```

**Principles:**
- Core library is pure, testable, takes database as first argument
- CLI layer only handles interaction and parsing
- All business logic lives in the core
- Database connection is injectable for testing

### File Structure

```
ananta/
├── deno.json              # Deno config, imports, tasks
├── drizzle.config.ts      # Drizzle ORM configuration
├── README.md              # This file
├── data/                  # gitignored
│   └── db.sqlite          # SQLite database
├── drizzle/               # gitignored
│   └── ...                # Generated migrations
└── src/
    ├── types.ts           # Domain enums and types
    ├── db/
    │   ├── schema.ts      # Drizzle schema definitions
    │   ├── connection.ts  # Database factory (DI support)
    │   └── test-utils.ts  # In-memory DB for tests
    ├── lib/
    │   ├── activities.ts  # Activity CRUD operations
    │   ├── entries.ts     # Entry logging and retrieval
    │   └── progress.ts    # Progress/status calculations
    └── cli/
        ├── main.ts        # CLI entry point
        ├── commands/      # Subcommand implementations
        └── flows/         # Interactive flow handlers
```

## Tech Stack

- **Runtime**: [Deno](https://deno.land/)
- **CLI/Prompts**: [Cliffy](https://cliffy.io/)
- **Database**: SQLite via [libsql](https://github.com/tursodatabase/libsql)
- **ORM**: [Drizzle](https://orm.drizzle.team/)
- **Testing**: Deno's built-in test runner with in-memory SQLite

## Development

### Setup

```bash
# Install dependencies (generates node_modules for Drizzle Kit)
deno install

# Generate database schema
deno task db:generate

# Run migrations
deno task db:migrate
```

### Commands

```bash
# Type check
deno task check

# Run tests
deno task test

# Start CLI (production mode)
deno task start

# Start CLI (dev mode with watch)
deno task dev

# Database tools
deno task db:generate    # Generate migrations from schema
deno task db:migrate     # Apply migrations
deno task db:studio      # Launch Drizzle Studio
```

### Testing

All core library functions are tested with in-memory SQLite databases:

```typescript
import { createTestDatabase } from "../db/test-utils.ts";

const db = createTestDatabase(); // Fresh :memory: DB
// ... test with db
```

## Installation

```bash
deno install --allow-read --allow-write --allow-env --allow-ffi \
  --name ananta \
  https://raw.githubusercontent.com/yourusername/ananta/main/src/cli/main.ts
```

## API Reference

### Activities

```typescript
// Create a task
createTask(db, {
  name: "Clean bathroom",
  intervalDays: 30
});

// Create a pursuit
createPursuit(db, {
  name: "Climbing",
  mode: "sessions",
  targetValue: 3,
  targetPeriod: "weekly"
});

// Retrieve
getActivity(db, id);
listActivities(db, { kind?: "task" | "pursuit" });
searchActivities(db, "climb");

// Update/Delete
updateActivity(db, id, changes);
deleteActivity(db, id);
```

### Entries

```typescript
// Log an entry
logEntry(db, { activityId: 1 });                    // Task or session
logEntry(db, { activityId: 2, durationMinutes: 45 }); // Duration

// Retrieve
getEntriesForActivity(db, activityId, {
  from?: Date,
  to?: Date
});
getRecentEntries(db, limit);
```

### Progress

```typescript
// Check task status
getTaskStatus(db, taskId);
// Returns: { daysSinceLastCompletion, isOverdue, daysUntilDue }

// Check pursuit progress
getPursuitProgress(db, pursuitId, period);
// Returns: { current, target, percentage, periodStart, periodEnd }
```

## License

MIT
