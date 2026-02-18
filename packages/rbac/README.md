# @krutai/rbac

> Role-Based Access Control (RBAC) for KrutAI — type-safe, inheritance-aware, framework-agnostic.

[![npm version](https://img.shields.io/npm/v/@krutai/rbac)](https://www.npmjs.com/package/@krutai/rbac)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- ✅ **Type-safe** — full TypeScript with strict types
- 🔗 **Role inheritance** — roles can inherit permissions from parent roles
- 🃏 **Wildcard permissions** — `posts:*` or `*:*` for broad grants
- 🏗️ **Pre-built roles** — `guest`, `user`, `moderator`, `admin`, `super_admin`
- 🛡️ **Guard helpers** — framework-agnostic guard factories
- 🔌 **Middleware** — Express / Next.js-compatible middleware factories
- 🚨 **Descriptive errors** — `PermissionDeniedError`, `RoleNotFoundError`, `CircularInheritanceError`

---

## Installation

```bash
npm install @krutai/rbac
# or
bun add @krutai/rbac
```

---

## Quick Start

```typescript
import { RBACManager, defineRole, definePermission } from '@krutai/rbac';

// 1. Define your roles
const rbac = new RBACManager({
  roles: [
    defineRole({
      name: 'user',
      permissions: ['posts:read', 'posts:create'],
    }),
    defineRole({
      name: 'admin',
      permissions: ['posts:delete', 'users:manage'],
      inherits: ['user'], // inherits all user permissions
    }),
  ],
  defaultRole: 'user',
});

// 2. Build a context from your auth session
const ctx = { userId: 'u_123', roles: ['admin'] };

// 3. Check permissions
rbac.can(ctx, 'posts:read');    // true (inherited from user)
rbac.can(ctx, 'posts:delete'); // true
rbac.can(ctx, 'billing:read'); // false
rbac.cannot(ctx, 'billing:read'); // true
```

---

## Core API

### `RBACManager`

```typescript
const rbac = new RBACManager(config: RBACConfig);
```

#### Role Management

| Method | Description |
|--------|-------------|
| `addRole(role)` | Register a new role |
| `removeRole(name)` | Remove a role by name |
| `getRole(name)` | Get a role definition |
| `getAllRoles()` | List all registered roles |

#### Permission Resolution

| Method | Description |
|--------|-------------|
| `getPermissionsForRole(name)` | Resolved `Set<Permission>` for a role (includes inherited) |
| `getPermissionsForRoles(names[])` | Union of permissions across multiple roles |

#### Permission Checks

| Method | Description |
|--------|-------------|
| `can(ctx, permission)` | Returns `true` if context has the permission |
| `cannot(ctx, permission)` | Inverse of `can` |
| `hasPermission(ctx, permission)` | Same as `can` |
| `hasAnyPermission(ctx, permissions[])` | True if context has ≥1 permission |
| `hasAllPermissions(ctx, permissions[])` | True if context has all permissions |
| `hasRole(ctx, roleName)` | True if context has the role |
| `hasAnyRole(ctx, roleNames[])` | True if context has ≥1 role |
| `check(ctx, permissions[], opts?)` | Detailed result with `granted`, `missing` |

---

## Permission Strings

Permissions follow the `resource:action` convention:

```typescript
import { definePermission, crudPermissions, wildcardPermission } from '@krutai/rbac';

definePermission('posts', 'read')   // "posts:read"
crudPermissions('posts')            // ["posts:create", "posts:read", "posts:update", "posts:delete"]
wildcardPermission('posts')         // "posts:*"
wildcardPermission('*')             // "*:*" — grants everything
```

---

## Role Inheritance

```typescript
const rbac = new RBACManager({
  roles: [
    { name: 'guest',     permissions: ['public:read'] },
    { name: 'user',      permissions: ['profile:read'], inherits: ['guest'] },
    { name: 'moderator', permissions: ['posts:delete'], inherits: ['user'] },
    { name: 'admin',     permissions: ['users:manage'], inherits: ['moderator'] },
  ],
});

const ctx = { roles: ['moderator'] };
rbac.can(ctx, 'public:read');   // true (guest → user → moderator)
rbac.can(ctx, 'profile:read'); // true (user → moderator)
rbac.can(ctx, 'posts:delete'); // true
rbac.can(ctx, 'users:manage'); // false (admin only)
```

---

## Pre-built Roles

```typescript
import { DEFAULT_ROLES, ADMIN_ROLE, SUPER_ADMIN_ROLE } from '@krutai/rbac';

const rbac = new RBACManager({ roles: DEFAULT_ROLES });
// Includes: guest, user, moderator, admin, super_admin
```

---

## Guard Helpers

```typescript
import { createPermissionGuard, createRoleGuard } from '@krutai/rbac';

const canDeletePosts = createPermissionGuard(rbac, 'posts:delete');
const isAdmin = createRoleGuard(rbac, 'admin');

canDeletePosts(ctx); // boolean
isAdmin(ctx);        // boolean
```

---

## Express / Next.js Middleware

```typescript
import { requirePermission, requireRole } from '@krutai/rbac';

// Attach rbacContext in your auth middleware first:
app.use((req, res, next) => {
  req.rbacContext = { userId: req.user.id, roles: req.user.roles };
  next();
});

// Then protect routes:
app.delete('/posts/:id', requirePermission(rbac, 'posts:delete'), deleteHandler);
app.get('/admin',        requireRole(rbac, 'admin'),              adminHandler);
```

---

## Error Handling

```typescript
import { PermissionDeniedError, RoleNotFoundError } from '@krutai/rbac';

try {
  if (rbac.cannot(ctx, 'posts:delete')) {
    throw new PermissionDeniedError('posts:delete', ctx.roles);
  }
} catch (err) {
  if (err instanceof PermissionDeniedError) {
    console.error(err.message);  // "Permission denied: "posts:delete" is required..."
    console.error(err.permission); // "posts:delete"
    console.error(err.roles);      // ["user"]
  }
}
```

---

## License

MIT © KrutAI
