---
name: bootstrap
description: Bootstrap the project with custom configuration, database schemas, and admin pages based on your specific SaaS idea.
argument-hint: [project name]
---

# Indie Kit Project Bootstrapper

You are an expert software architect and developer. Your task is to bootstrap a new SaaS project from this boilerplate based on the user's requirements.

## Phase 1: Information Gathering (Interactive)

**Step 1.1**: Check if the user provided a project name in the arguments.

- If NOT, ask: "What is the name of your new SaaS project?"
- If YES, proceed.

**Step 1.2**: Ask for a brief description.

- "Could you give me a one-sentence description of what [Project Name] does?"

**Step 1.3**: Ask for Theme Preference.

- "Which visual theme would you like to use? (e.g., Modern Minimal, T3 Chat, Twitter, etc.)"

**Step 1.4**: Ask for Key User Flows / Entities.

- "What are the core entities or resources in your app? (e.g., for a course platform: 'Courses', 'Lessons', 'Quizzes'. For a project manager: 'Projects', 'Tickets')."
- "For each entity, clarify:
  1.  Should users manage these in their dashboard? (e.g., `/app/projects`)
  2.  Should Super Admins also manage these?
  3.  Is the main dashboard an overview/stats page or a direct list/form for these entities?"

**Step 1.5**: Ask about Credits.

- "Does your app use a credit system (e.g., for AI usage)? If yes, what should we call the credit units? (e.g. 'image_generation', 'tokens'). If not, we can skip this."
  Use skill `credits-handler` to handle credits implementation. Also use skill `plans-handler` to handle plans implementation if required.

**Step 1.6**: Ask about AI Integration (If applicable).

- If the project involves AI, ask for specifics: "Which AI models, platforms, or SDKs will you be using? (e.g., Vercel AI SDK, Replicate, Fal.ai, OpenAI, or a combination?)"
- If the things should happen in background processing? If yes, then use skill `inngest-handler` to handle the implementation. Generally AI based models should be handled using `inngest-handler` and `ai-handler` skill because it will handle the background processing and credit deduction and other related stuff.
- If the things should happen in real time, then use skill `ai-sdk-handler` to handle the implementation.
- Whether Chat UI is required? If yes, then use skill `ai-sdk-handler` to handle the implementation.

**Step 1.7**: Design & Requirements Deep Dive.

- "Are there any specific requirement documents or knowledge base items the AI should be aware of?"
- "Any specific preferences for the Landing Page or App Header design? (e.g., navigation style, specific sections needed)."

**Step 1.8**: Ask about Logo Generation.

- "Would you like me to generate a logo for [Project Name] using AI? If yes, I'll create a minimalistic logo design and save it to `public/assets/logo.png`. (Note: Requires `REPLICATE_API_TOKEN` to be set in your environment)"

**Step 1.9**: Ask about Landing Page Assets.

- "Would you like me to generate images/assets for your landing page (hero sections, feature showcases, transformations)? If yes, I'll create appropriate images using AI and save them to `public/assets/images/`. (Note: Requires `REPLICATE_API_TOKEN` to be set in your environment)"

## Phase 2: Execution Plan

Once you have the answers, announce the plan: "Great! I'm now going to bootstrap [Project Name]. Here is the plan:"

1.  Update Config (`lib/config.ts` & `lib/credits/config.ts`).
2.  Generate Logo (if requested) using `logo-generator` skill.
3.  Install Selected Theme.
4.  Create Database Schemas (`db/schema/*.ts`).
5.  Create Admin Forms & APIs (if applicable).
6.  Create User Entity Pages & APIs (`app/(in-app)/app/[entity]/`).
7.  Generate Landing Page Assets (if requested) using `generate-assets` skill.
8.  Customize Landing Page (`app/(website-layout)/page.tsx`).
9.  Create In-App Dashboard & Navigation.
10. Update Component Content & Theme.


If WYSIWYG Editor is required, then use skill `plate-handler` to handle the implementation.

If credits are used, then use skill `credits-handler` to handle credits implementation. Also use skill `plans-handler` to handle plans implementation if required.

If AI based model or some background processing is required, then use skill `inngest-handler` to handle the implementation. Generally AI based models should be handled using `inngest-handler` and `ai-handler` skill because it will handle the background processing and credit deduction and other related stuff.

If logo generation is requested, then use skill `logo-generator` to handle the logo generation. Ensure `REPLICATE_API_TOKEN` is set before running the logo generation script.

If landing page assets are requested, then use skill `generate-assets` to handle asset generation. Generate appropriate images for:
- Hero sections (16:9 or 21:9 aspect ratio)
- Feature showcases (1:1 or 4:3 aspect ratio)
- Transformation/process visuals (16:9 aspect ratio)
Ensure `REPLICATE_API_TOKEN` is set before running the asset generation scripts.

**Confirm with the user: "Shall I proceed?"**

## Phase 3: Implementation

After confirmation, execute the following changes. **Do not ask for permission for each file, just do it.**

### 1. Configuration

- **`src/lib/config.ts`**: Update `projectName`, `description`, and `keywords`.
- **`src/lib/credits/config.ts`**: If credits are used, update `creditTypeSchema` and `creditsConfig` with the user's types.

### 2. Logo Generation (If requested)

- Use skill `logo-generator` to generate the logo.
- Run: `pnpm run script .claude/skills/logo-generator/scripts/generate-logo.ts "Minimalistic Logo Design for [Project Name]" "[Project Name]"`
- The logo will be saved to `public/assets/logo.png` with transparent background and optimized padding.
- **Note**: Ensure `REPLICATE_API_TOKEN` is set in your environment before running.

### 3. Theme Installation

- Install the selected theme using the `theme-handler` logic.
- Run the appropriate command: `pnpm dlx shadcn@latest add <theme-url>` (Refer to `theme-handler` skill for URLs). also give url https://tweakcn.com/editor/theme to user choose theme name from dropdown.

### 4. Database Schema

- For each entity identified in Step 1.4, create a file `src/db/schema/[entity-name].ts`.
- Use `drizzle-orm/pg-core` (pgTable, text, timestamp, uuid) and `zod`.
- **Reference**: Look at `src/db/schema/plans.ts` for style.
- Ensure columns include `id` (uuid default random), `createdAt`, `updatedAt`, and relevant fields for the entity.

### 5. Super Admin Interface (If requested)

For each entity requiring admin access:

- **Directory**: `src/app/super-admin/[entity-plural]/`
- **Pages**: List, Create, Edit.
- **API**: Standard CRUD routes.

### 6. User Entity Pages & APIs

For each entity requiring user management:

- **Directory**: `src/app/(in-app)/app/[entity-plural]/`
- **Pages**:
  - `page.tsx` (List View)
  - `create/page.tsx` (Create Form)
  - `[id]/page.tsx` (Detail/Edit)
  - use useCredits or useCurrentPlan or useUser to get the user data based on the entity required on client side components.
- **API Routes**: `src/app/api/app/[entity-plural]/...`
  - Ensure all queries are scoped to `req.auth.user.id`.
  - use withAuthRequired in API routes

### 7. Landing Page Assets Generation (If requested)

Use skill `generate-assets` to create images for the landing page. The script automatically:
- **Enhances prompts** with modern UI elements, gradients, patterns, and theme-aware styling
- **Detects existing image sizes** and matches them if replacing images
- **Uses appropriate defaults** for new images based on asset type

- **Hero Section Image**: Generate a hero image showing the product/solution in action
  - Run: `pnpm run script .claude/skills/generate-assets/scripts/generate-asset.ts "[simple prompt]" "" "hero-[project-name]" "hero" "hero" "false"`
  - Example prompt: "[Project Name] dashboard interface showing [key feature]"
  - Script will enhance with modern UI, gradients, patterns automatically
  
- **Feature Showcase Images**: Generate images for each key feature (if needed)
  - Run: `pnpm run script .claude/skills/generate-assets/scripts/generate-asset.ts "[simple prompt]" "" "feature-[feature-name]" "features" "feature" "false"`
  - Create 2-4 feature images based on the main features
  - Script auto-detects size if replacing existing images
  
- **Transformation/Process Images**: If showing how the solution works
  - Run: `pnpm run script .claude/skills/generate-assets/scripts/generate-asset.ts "[simple prompt]" "" "transformation-[name]" "transformations" "transformation" "false"`
  
- **Foreground/Decorative Assets**: For smaller decorative elements (if needed)
  - Run: `pnpm run script .claude/skills/generate-assets/scripts/generate-asset.ts "[simple prompt]" "" "decorative-[name]" "foreground" "foreground" "true"`
  - Uses transparent background removal

**Note**: 
- Prompts are automatically enhanced - use simple, descriptive prompts
- All assets saved as WebP format in `public/assets/images/[folder]/`
- Script handles aspect ratios and sizing automatically
- Ensure `REPLICATE_API_TOKEN` is set before running
- Reference generated assets in landing page components using Next.js Image component

### 8. Landing Page & Layout

- **`src/app/(website-layout)/page.tsx`**:
  - Replace content with a compelling landing page.
  - Use generated assets from Step 7 in hero sections and feature showcases.
  - Reference assets using Next.js Image component: `<Image src="/assets/images/hero/hero-[project-name].webp" alt="..." width={1920} height={1080} />`
  - Update layout and internal components as needed to look good.
  - If user opted for credits then use useBuyCredits to customise website-credits-section.
- **`src/app/(website-layout)/layout.tsx`**:
  - Update metadata and structure.

### 9. In-App Dashboard & Navigation

- **`src/app/(in-app)/app/page.tsx`**:
  - Remove demo content.
  - Create a professional dashboard (Stats, Recent Items, Quick Actions).
  - If the user requested a direct form/list as the main view, implement that instead.
- **`src/components/layout/app-header.tsx`**:
  - Add navigation links for the new User Entity Pages.
- **`src/app/(in-app)/layout.tsx`**:
  - Update the `DashboardSkeleton` to match the new layout and header structure.

### 10. Component Content & Theme

- Update the content of used components (e.g., hero, features, testimonials) to reflect the project's idea and theme.
- Adjust the layout and styling if needed to match the specific requirements.

## Completion

Once finished, report back:
"✅ Project [Project Name] has been bootstrapped!

- Config updated.
- Logo generated (if requested).
- Theme installed.
- Schemas created.
- Admin pages created (if applicable).
- User pages & APIs created: [List paths].
- Landing page assets generated (if requested).
- Landing page customized.
- In-app dashboard & Header updated.

### 11. Final Setup

- **Database Migration**: Run `npx drizzle-kit push`.