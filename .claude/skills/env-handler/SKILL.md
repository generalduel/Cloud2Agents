---
name: env-handler
description: Manage environment variables securely. Handles distinction between .env.example (template) and .env.local (secrets).
---

# Environment Variable Handler

## Core Rules
1.  **`.env.example` is the committed template**: Add new variables here with placeholders. Developers copy to `.env.local` for secrets.
2.  **Secrets in `.env.local`**: Actual sensitive values must live in `.env.local` (git-ignored).
3.  **Never commit secrets**: Use empty strings or obvious placeholders in `.env.example`.

## Instructions

### 1. Adding a New Sensitive Variable
When you need to add a secret (e.g., `REPLICATE_API_TOKEN`):

1.  **Update `.env.example`**:
    Add the variable with an empty string or placeholder value.
    ```bash
    # .env.example
    REPLICATE_API_TOKEN=""
    ```

2.  **Ask the User**:
    Explicitly request the user to add the actual value to their local secrets file.
    > "I have added `REPLICATE_API_TOKEN` to `.env.example`. Copy it to `.env.local` and set the real value: `REPLICATE_API_TOKEN=your_token_here`"

### 2. Adding a Non-Sensitive Variable
When adding a public or configuration variable (e.g., `NEXT_PUBLIC_APP_URL`):

1.  **Update `.env.example`**:
    Add the variable with its default or development value.
    ```bash
    # .env.example
    NEXT_PUBLIC_APP_URL="http://localhost:3000"
    ```

### 3. Reading Variables
-   Server-side: `process.env.KEY`
-   Client-side: `process.env.NEXT_PUBLIC_KEY`

### 4. Optional integrations
Do not instantiate payment/storage SDKs at module load. Use lazy getters documented in `reference.md` (`getStripe()`, `getS3Client()`, etc.) so `pnpm build` works when those env vars are unset.

## Checklist
- [ ] Is the variable in `.env.example`?
- [ ] If sensitive, is the value in `.env.example` empty or a placeholder?
- [ ] Did I ask the user to update `.env.local`?
