# Deployable Status

## Deployability criteria

The GrowMark functionality tests are considered deployable when the following conditions are met:

1. All high-priority functional workflows pass.
2. UI/UX issues affecting navigation, visibility, or accessibility are resolved.
3. Validation rules prevent invalid data entry across onboarding, sales, and profile flows.
4. Unit tests cover critical business logic and utility functions.
5. Report generation and automation infrastructure are stable.

## Readiness levels

| Level | Description |
|---|---|
| Green | All planned tests are implemented and passing. Ready for release. |
| Yellow | Most critical tests pass. Some non-blocking cases remain to be automated. |
| Red | Critical failures exist in core workflows or major validation rules. Not release-ready. |

## Recommended deployment stages

- **Pre-release**: Execute UI/UX and functional test cases for major workflows.
- **Release candidate**: Add validation and unit coverage for regressions.
- **Production-ready**: Confirm all deployability criteria and run the full suite.

## Proposed status matrix

- UI/UX tests: ready for automation with 80 cases defined.
- Functional tests: ready for automation with 120 cases defined.
- Unit tests: ready for automation with 60 cases defined.
- Validation tests: ready for automation with 60 cases defined.

## Suggested tracking

Use the following values when tracking implementation:

- ✅ Complete and automated
- 🟡 Defined, automation pending
- ⚠️ Incomplete or blocked
- ❌ Not started

## Recommendation

Start by implementing the highest-value functional cases in the order they appear in `test-cases/functional-tests.md`, then add UI/UX refinements, followed by validation and unit coverage.
