---
name: auth-handler
description: Manage authentication, authorization, and user sessions. Use when dealing with login, sign-up, API protection, middleware, or user data fetching.
tools: Read, Write, Edit
model: inherit
---

# Auth Handler

This project uses **Better Auth**, not Auth.js / NextAuth.

## Instructions

### 1. API Route Protection
- **Standard Routes**: Use `withAuthRequired`.
  ```typescript
  export default withAuthRequired(async (req, { session, getUser }) => { ... })
  ```
- **Super Admin Routes**: Use `withSuperAdminAuthRequired`.
- **Cron Jobs**: Use `cronAuthRequired`.
- **Defense in Depth**: Do NOT rely solely on middleware. Always implement individual route protection.

### 2. Admin roles & permissions
- **Default**: `app_user.role` is `admin` or `user`. Super-admin routes use `withSuperAdminAuthRequired`.
- **Custom permissions**: `createAccessControl` + `admin({ ac, roles })` on server and `adminClient({ ac, roles })` on client. Check with `auth.api.userHasPermission` — see `.cursor/rules/better-auth.mdc` and https://better-auth.com/docs/plugins/admin#roles
- Do not add zod enums mirroring Better Auth default admin/user roles.

### 3. Frontend Data Access
- **Client Components**: Use `useUser()` hook (SWR).
- **Auth actions**: `authClient` from `@/lib/auth-client`.
- **Restriction**: NEVER use `useSession` from `next-auth/react`.

### 4. Server-Side Data Access
- Import `{ auth, type AuthSession }` from `@/auth`.
- Session: `await auth.api.getSession({ headers: req.headers })` (or `headers: await headers()` in RSC).
- Do not call `auth()` as a function — that is the Auth.js API.

## Reference
For architecture details, key files, and debugging tips, see [reference.md](reference.md).
