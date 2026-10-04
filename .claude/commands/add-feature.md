---
name: add-feature
description: Add a new feature to the project, handling database, API, UI, and integration with existing systems like credits and plans.
argument-hint: [feature name]
---

# Add Feature Command

You are an expert software architect and developer. Your task is to add a new feature to the existing SaaS project, ensuring seamless integration with the current architecture, database, and patterns.

## Phase 1: Information Gathering & Context (Interactive)

**Step 1.1**: Analyze the Request.
-   If the user provided a `[feature name]`, use it.
-   If NOT, ask: "What is the name of the feature you want to add?"

**Step 1.2**: Analyze Existing Context (Silent).
-   **Database**: Read `src/db/schema/` to understand existing entities.
-   **API**: Read `src/app/api/` to understand current patterns (authentication, validation).
-   **Monetization**: Read `src/lib/credits/config.ts` and `src/lib/plans/config.ts` to understand available plans and credit types.
-   **Skills**: Review `.claude/skills/` to know what capabilities are available (e.g., `db-handler`, `ui-handler`, `credits-handler`, `plans-handler`, `email-handler`, etc.).

**Step 1.3**: Ask for Details (Interactive).
-   Ask the user for a detailed use case: "Please describe the primary use case for [Feature Name]. Who uses it and what problem does it solve?"

**Step 1.4**: Deep Dive Questions (Max 4-5).
Based on the context and description, ask up to 5 specific questions to clarify technical requirements. Do not ask generic questions if you can infer the answer.
1.  **Data**: "Does this require storing new data? If so, what are the key fields? (e.g., specific relationships to Users or other entities)."
2.  **UI/UX**: "Where should this feature live in the UI? (e.g., a new Dashboard tab, a public page, or a modal within an existing page?)."
3.  **Monetization**: "Is this feature restricted to specific plans or does it consume credits? (Refer to `credits-handler` and `plans-handler`)."
4.  **Integrations**: "Does this feature need to send emails, upload files, or use AI? (Refer to `email-handler`, `s3-upload-handler`, `ai-handler`)."
5.  **Background Processing**: "Does this feature need to happen in background processing? If yes, then use skill `inngest-handler` to handle the implementation. Generally AI based models should be handled using `inngest-handler` and `ai-handler` skill because it will handle the background processing and credit deduction and other related stuff."
6.  **Chat UI**: "Does this feature need to have a chat UI? If yes, then use skill `ai-sdk-handler` to handle the implementation."
7.  **Visual Assets**: "Does this feature need images or visual assets (e.g., hero images, feature showcases, transformation visuals)? If yes, I can generate them using AI. (Note: Requires `REPLICATE_API_TOKEN` to be set)"
8.  (Optional) **Permissions**: "Are there specific role-based access controls (Super Admin vs User)?"

## Phase 2: Execution Plan

Once you have the answers, formulate a comprehensive plan using the available skills.

**Step 2.1**: Propose the Plan.
"Thanks! I have a plan to implement [Feature Name]:"

1.  **Database Schema** (`db-handler`):
    -   List new tables or columns to be added in `src/db/schema/`.
    -   Define relationships.
2.  **API & Logic** (`api-handler` patterns):
    -   Define API routes (`src/app/api/...`).
    -   Define server actions if applicable.
    -   Mention validation (`zod`) and auth checks.
3.  **Monetization & Permissions** (`credits-handler`, `plans-handler`):
    -   Specify if `useCredits` or plan checks are needed.
4.  **User Interface** (`ui-handler`, `form-creator`):
    -   List new components or pages (`src/app/(in-app)/...`).
    -   Mention specific UI patterns (tables, forms, cards).
5.  **Integrations** (e.g., `email-handler`, `s3-upload-handler`):
    -   List any external service integration steps.
    -   Need background processing? use inngest-handler to create a new event and function.
6.  **Visual Assets** (`generate-assets`):
    -   If visual assets are needed, specify what images to generate (hero, feature showcases, transformations).
    -   Mention appropriate aspect ratios and folder structure.

If WYSIWYG Editor is required, then use skill `plate-handler` to handle the implementation.

If visual assets are requested, then use skill `generate-assets` to handle asset generation. Generate appropriate images with correct aspect ratios:
- Hero/preview images: `16:9` or `21:9`
- Feature showcases: `1:1` or `4:3`
- Transformations/processes: `16:9`
Ensure `REPLICATE_API_TOKEN` is set before running the asset generation scripts.

**Confirm with the user: "Shall I proceed with this plan?"**

## Phase 3: Implementation

After confirmation, execute the plan step-by-step. **Do not ask for permission for each individual file.**

### 1. Database Implementation
-   Create/Update schema files in `src/db/schema/` using `db-handler` best practices.
-   Ensure `id`, `createdAt`, `updatedAt` are present.
-   Export schemas correctly.

### 2. Core Logic & API
-   Create API routes or Server Actions.
-   Implement permission checks (`req.auth.user.id`).
-   Implement credit deductions if planned (`credits-handler`).
-   Implement plan gating if planned (`plans-handler`).

### 3. Visual Assets Generation (If requested)
-   Use skill `generate-assets` to create images for the feature. The script automatically:
    -   **Enhances prompts** with modern UI elements, gradients, patterns, and theme-aware styling
    -   **Detects existing image sizes** and matches them if replacing images
    -   **Uses appropriate defaults** for new images based on asset type
-   **Hero/Preview Images**: Generate images showing the feature in action
    -   Run: `pnpm run script .claude/skills/generate-assets/scripts/generate-asset.ts "[simple prompt]" "" "feature-[feature-name]-hero" "[feature-folder]" "hero" "false"`
    -   Example: "dashboard showing [feature name] interface"
    -   Script enhances with modern UI, gradients, patterns automatically
-   **Feature Showcase**: If needed, generate showcase images
    -   Run: `pnpm run script .claude/skills/generate-assets/scripts/generate-asset.ts "[simple prompt]" "" "feature-[feature-name]-showcase" "[feature-folder]" "feature" "false"`
    -   Script auto-detects size if replacing existing images
-   **Transformation/Process**: If showing how the feature works
    -   Run: `pnpm run script .claude/skills/generate-assets/scripts/generate-asset.ts "[simple prompt]" "" "feature-[feature-name]-process" "[feature-folder]" "transformation" "false"`
-   **Foreground/Decorative Assets**: For smaller decorative elements (if needed)
    -   Run: `pnpm run script .claude/skills/generate-assets/scripts/generate-asset.ts "[simple prompt]" "" "feature-[feature-name]-decorative" "[feature-folder]" "foreground" "true"`
    -   Uses transparent background removal
-   **Note**: 
    -   Prompts are automatically enhanced - use simple, descriptive prompts
    -   All assets saved as WebP in `public/assets/images/[feature-folder]/`
    -   Script handles aspect ratios and sizing automatically
    -   Reference assets in UI components using Next.js Image component

### 4. User Interface
-   Create the necessary UI components using `ui-handler` (Shadcn UI).
-   Create forms using `form-creator` (react-hook-form + zod).
-   Use generated assets from Step 3 in components where appropriate.
-   Reference assets: `<Image src="/assets/images/[feature-folder]/[filename].webp" alt="..." width={1920} height={1080} />`
-   Ensure the UI is responsive and matches the current theme (`theme-handler`).
-   Add navigation items in `src/components/layout/app-header.tsx` or `src/components/layout/sidebar.tsx` if needed.

### 5. Final Wiring
-   Connect the UI to the API/Actions.
-   Handle loading states and error messages.
-   Update `src/lib/config.ts` if new constants are needed.

## Completion
Report back:
"✅ Feature [Feature Name] has been successfully added!
-   **Database**: [Summary of changes].
-   **API**: [Summary of routes created].
-   **Visual Assets**: [Summary of generated images, if any].
-   **UI**: [Summary of pages/components].
-   **Integrations**: [Summary of credits/plans/etc applied].

### Final Steps
1.  **Database Migration**: Run `npx drizzle-kit push` to apply schema changes.
2.  **Verify**: Check the feature at [URL].
"

