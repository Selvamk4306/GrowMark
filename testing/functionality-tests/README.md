# Functionality Tests Suite

This folder contains the new `functionality-tests` suite for GrowMark.
It includes:

- `test-plan.md` — suite summary, scope, and counts.
- `test-cases/` — detailed unique test case lists by category.
- `deployable-status.md` — deployability criteria and readiness matrix.
- `specs/` — starter test spec structure for each category.

## Purpose

This suite is designed to support the following test types:

- UI/UX test coverage
- Functional testing
- Unit testing
- Validation testing

Each category contains a unique set of test cases, totaling over 300 unique test cases.

## How to use

1. Review `test-plan.md` for the overall breakdown.
2. Use the category-specific `test-cases/*.md` files to track implementation.
3. Add executable tests under `specs/` as automation is built out.
4. Generate the Excel analysis report by running `npm run report` inside `testing/functionality-tests`.
