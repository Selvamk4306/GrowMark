# GrowMark Automated Testing Setup - TODO

## Goal
Set up end-to-end testing for GrowMark (web + mobile) with 300+ test cases, Excel report generation, and GitHub Actions CI workflow.

## Steps
- [ ] 1. Move `appium-tests/` folder into `testing/appium/`
- [ ] 2. Update appium package.json / paths after move
- [ ] 3. Create Selenium web testing framework in `testing/selenium/`
  - [ ] 3a. package.json + tsconfig.json
  - [ ] 3b. config (Selenium WebDriver)
  - [ ] 3c. test-cases.ts (300+ cases)
  - [ ] 3d. excel-generator.ts
  - [ ] 3e. runner.ts
  - [ ] 3f. utils/helpers
  - [ ] 3g. tests/ organized specs
- [ ] 4. Create GitHub Actions workflow `.github/workflows/e2e-testing.yml`
- [ ] 5. Install dependencies for selenium + appium
- [ ] 6. Run test suites, verify Excel reports generate
- [ ] 7. Verify test case count >= 300
