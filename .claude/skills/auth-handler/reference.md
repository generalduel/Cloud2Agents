# Auth Architecture Reference

## Key Files
- **Config**: `src/auth.ts` (`betterAuth()`, drizzle adapter, `admin` + `magicLink` plugins)
- **Client**: `src/lib/auth-client.ts` (`createAuthClient`)
- **Handler**: `src/app/api/auth/[...all]/route.ts` (`toNextJsHandler(auth)`)
- **Schema**: `src/db/schema/user.ts` (`app_user`, `session`, `account`, `verification`)
- **Middleware**: `src/proxy.ts` (`auth.api.getSession`)

## Helpers
- `src/lib/auth/withAuthRequired.ts`
- `src/lib/auth/withSuperAdminAuthRequired.ts`
- `src/lib/auth/redirect-to-sign-in.ts`
- `src/lib/auth/cronAuthRequired.ts`
- `src/lib/users/useUser.ts` (Frontend hook)

## Drizzle adapter (critical)

`user.modelName` is `"app_user"` → schema key must be `app_user: users`, not `user: users`.

## Best Practices
1. **Defense in Depth**: Middleware (`proxy.ts`) is the first layer, but route wrappers are mandatory.
2. **Redirects**: `redirectToSignIn(buildCallbackUrl(path, searchParams))` — not bare `redirect("/sign-in")`.
3. **Environment**: `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`.
4. **Passwords**: Better Auth uses scrypt. Do not add `bcryptjs`.

## Common Tasks
- **Debugging Login**: Check plugins and providers in `src/auth.ts`.
- **Impersonation**: `auth.api.impersonateUser` via the Better Auth `admin` plugin.
