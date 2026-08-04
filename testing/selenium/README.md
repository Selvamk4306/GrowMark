# GrowMark Selenium Web E2E Tests

This folder contains the web automation test suite for the GrowMark application using Selenium WebDriver and TypeScript.

## Run locally

1. Install dependencies:
   ```bash
   cd testing/selenium
   npm install
   ```

2. Build or export the web app:
   ```bash
   cd ..
   npx expo export:web --output-dir web-build
   ```

3. Serve the exported web app:
   ```bash
   npx http-server web-build -p 5000
   ```

4. Run tests:
   ```bash
   cd testing/selenium
   npm test
   ```

## Output

- `GrowMark-Web-Test-Report.xlsx` is generated in this folder after test completion.
