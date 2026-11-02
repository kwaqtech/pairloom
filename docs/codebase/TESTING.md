# Testing Patterns

## Core Sections (Required)

### 1) Test Stack and Commands

- Primary test framework: none
- Assertion/mocking tools: none
- Commands:

```bash
# No test runner is configured in this repository.
```

### 2) Test Layout

- Test file placement pattern: no `test/`, `tests/`, `__tests__/`, or `*.spec.js` in the scan tree
- Naming convention: n/a
- Setup files and where they run: n/a

### 3) Test Scope Matrix

| Scope | Covered? | Typical target | Notes |
|-------|----------|----------------|-------|
| Unit | no | n/a | No test files |
| Integration | no | n/a | No test files |
| E2E | no | n/a | Manual browser check only |

### 4) Mocking and Isolation Strategy

- Main mocking approach: n/a
- Isolation guarantees: n/a
- Common failure mode in tests: n/a

### 5) Coverage and Quality Signals

- Coverage tool + threshold: [TODO] none
- Current reported coverage: [TODO] none
- Known gaps/flaky areas: date math (`js/counter.js`), playlist index (`js/vinyl.js`), localStorage quota (`js/state.js`) are untested

### 6) Evidence

- `docs/codebase/.codebase-scan.txt` (PERFORMANCE & TESTING: none; no test files in tree)
