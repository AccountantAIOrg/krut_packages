# AI Reference — @krutai/rbac

## Package Overview
- **Name**: `@krutai/rbac`
- **Version**: `0.1.1`
- **Purpose**: Role-Based Access Control (RBAC) library for KrutAI
- **Entry**: `src/index.ts` → `dist/index.{js,mjs,d.ts}`
- **Build**: `tsup` (CJS + ESM dual output, `krutai` is external peer dep)

## Dependency Architecture

```
@krutai/rbac@0.1.1
├── peerDependency: krutai >=0.1.2   ← auto-installed, provides API validation
└── peerDependency: @krutai/auth >=0.1.0  ← optional
```

> **Important for AI**: The validator (`validateApiKeyFormat`, `ApiKeyValidationError`, etc.) is NOT defined in this package. It is imported from `krutai` and re-exported. Do NOT add a local `validator.ts` here.

## File Structure
```
packages/rbac/
├── src/
│   ├── index.ts     # Barrel export (all public API)
│   ├── types.ts     # Core TypeScript interfaces and types
│   ├── errors.ts    # Custom error classes
│   ├── role.ts      # Role/permission helpers + pre-built roles
│   ├── rbac.ts      # RBACManager class (core engine)
│   └── guards.ts    # Guard factories + Express/Next.js middleware
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

## Key Exports

### Classes
- `RBACManager` — main RBAC engine

### Types
- `Permission` — `string` alias for `"resource:action"` format
- `Role` — `{ name, permissions, inherits?, description? }`
- `RBACConfig` — `{ roles, defaultRole? }`
- `RBACContext` — `{ userId?, roles, metadata? }`
- `CheckOptions` — `{ requireAll?: boolean }`
- `PermissionCheckResult` — `{ granted, permissions, roles, missing? }`
- `GuardFn` — `(context: RBACContext) => boolean`

### Helpers
- `defineRole(config)` — type-safe role definition
- `definePermission(resource, action)` — creates `"resource:action"` string
- `crudPermissions(resource)` — creates `[create, read, update, delete]` permissions
- `wildcardPermission(resource)` — creates `"resource:*"`

### Pre-built Roles
- `GUEST_ROLE`, `USER_ROLE`, `MODERATOR_ROLE`, `ADMIN_ROLE`, `SUPER_ADMIN_ROLE`
- `DEFAULT_ROLES` — array of all five in hierarchy order

### Guard Factories
- `createPermissionGuard(rbac, permission)` → `GuardFn`
- `createRoleGuard(rbac, roleName)` → `GuardFn`
- `createAllPermissionsGuard(rbac, permissions[])` → `GuardFn`
- `createAnyPermissionGuard(rbac, permissions[])` → `GuardFn`

### Middleware
- `requirePermission(rbac, permission)` — Express/Next.js middleware
- `requireRole(rbac, roleName)` — Express/Next.js middleware
- `withPermission(rbac, permission, handler, onDenied?)` — handler wrapper

### Errors
- `RBACError` — base class
- `PermissionDeniedError(permission, roles)` — access denied
- `RoleNotFoundError(roleName)` — role not in registry
- `CircularInheritanceError(chain)` — circular role inheritance

### Validator Re-exports (from `krutai`)
```typescript
// These are re-exported from krutai — NOT defined here
export { validateApiKeyFormat, validateApiKeyWithService, createApiKeyChecker, ApiKeyValidationError } from 'krutai';
```

## RBACManager API Summary

```typescript
// Construction
new RBACManager({ roles: Role[], defaultRole?: string })

// Role management
.addRole(role: Role): void
.removeRole(name: string): void          // throws RoleNotFoundError
.getRole(name: string): Role | undefined
.getAllRoles(): Role[]

// Permission resolution
.getPermissionsForRole(name: string): Set<Permission>   // throws RoleNotFoundError
.getPermissionsForRoles(names: string[]): Set<Permission>

// Checks
.can(ctx, permission): boolean
.cannot(ctx, permission): boolean
.hasPermission(ctx, permission, opts?): boolean
.hasAnyPermission(ctx, permissions[]): boolean
.hasAllPermissions(ctx, permissions[]): boolean
.hasRole(ctx, roleName): boolean
.hasAnyRole(ctx, roleNames[]): boolean
.check(ctx, permissions[], opts?): PermissionCheckResult
```

## Wildcard Permission Rules
- `*:*` or `*` → matches any permission
- `posts:*` → matches any action on `posts` resource
- `*:read` → matches `read` on any resource

## Role Inheritance
Permissions are resolved recursively. Cycles throw `CircularInheritanceError`.
Results are cached per role name for performance.

## Middleware Contract
`requirePermission` / `requireRole` expect `req.rbacContext: RBACContext` to be set
by a preceding auth middleware. Returns 401 if missing, 403 if denied.

## tsup Configuration Notes
- `krutai` → external (peer dep, NOT bundled — do NOT add to `noExternal`)
- No other special external/noExternal rules

## Important Notes

1. **Validator lives in `krutai`**: Never add a local `validator.ts` — import from `krutai`
2. **`krutai` must be external in tsup**: Do NOT add it to `noExternal`
3. **`krutai` in devDependencies**: Needed for local TypeScript compilation during development

## Related Packages

- `krutai` — Core utilities and API validation (peer dep)
- `@krutai/auth` — Authentication with Better Auth (optional peer dep)

## Links

- GitHub: https://github.com/AccountantAIOrg/krut_packages
- npm: https://www.npmjs.com/package/@krutai/rbac
