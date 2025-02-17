# API Helpers

This project generates Playwright API helpers from a Swagger URL. The helpers are categorized into admin and non-admin endpoints and are generated as classes with methods for each endpoint. Note that the generated helpers are TypeScript files and are intended to be used in a TypeScript project. For support please go to the [GitHub repository](https://github.com/SysSU/swagger-to-playwright-api-helpers).

## Installation

### NPM

```bash
npm add -D swagger-to-playwright-api-helpers
```

### Yarn

```bash
yarn add -D swagger-to-playwright-api-helpers
```

### PNPM

```bash
pnpm add -D swagger-to-playwright-api-helpers
```

## Usage

### Run CMD

```bash
  OUTPUT_DIR=/some/path SWAGGER_URL=http://swaggerUrl.com/json node ./node_modules/swagger-to-playwright-api-helpers/dist/cmd.js
```

## Example

Here is an example of how to use the generated helpers in your tests:

```typescript
import { ApiHelpers } from "./path/to/generated/apiHelpers";
import { test } from "@playwright/test";

test("create api context example", async ({ playwright }) => {
  // Create a new API context
  const baseURL = "https://api.example.com";
  const context = await playwright.request.newContext();
  const apiHelpers = new ApiHelpers(context, baseURL);

  // Use the context for API requests here
  const params = {
    // Endpoint parameters like query params, headers, etc.
  };

  const response = await apiHelpers.someMethod(baseURL, params);
  console.log(response);

  // Dispose of the context
  await context.dispose();
});
```

### With Base Fixture

The best way is to create and use a base fixture that creates the API context that can be used in your tests.

```typescript
// base.ts
import { base } from "@playwright/test";

const test = base.extend({
  apiContext: async ({ playwright }, use) => {
    const context = await playwright.request.newContext();
    await use(context);
    await context.dispose();
  },
});
```

```typescript
// test.ts
import { test } from "./base";

test("create api context example", async ({ apiContext }) => {
  const response = await apiContext.someMethod(baseURL, params);
  console.log(response);
});
```

# Development

## Dev Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/SysSU/swagger-to-playwright-api-helpers.git
   cd swagger-to-playwright-api-helpers
   ```

2. Install the dependencies:
   ```bash
   pnpm install
   ```

## Dev Commands

### Build and Publish

First, update the version in the `package.json` file. Then run the following commands:

```bash
pnpm build
npm publish
```

## License

```plaintext
MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
