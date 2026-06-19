# Streaks — build status

**Engine:** cyc-coordinator (opus). **Workers/testers:** sonnet, general-purpose.
**Started:** 2026-06-19. **Port:** 5181.

## Milestones
| id | title | state |
|----|-------|-------|
| m1 | Project scaffold + streak calculator (pure, unit-tested) | todo |
| m2 | localStorage habit store + Habit CRUD UI | todo |
| m3 | 365-day heatmap grid + toggle day + streak display | todo |
| m4 | JSON export/import | todo |
| m5 | Playwright e2e + browser verify full flow | todo |

## Gates (fail-closed)
- UNIT: executed > 0, failed == 0
- E2E: executed > 0, all pass
- VERIFY: tester drives real Chrome, creates habit, marks today done, observes
  heatmap cell fill + streak update, returns PASS with screenshot.

## Now
Starting m1.
