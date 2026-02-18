/**
 * Guard and middleware helpers for @krutai/rbac
 *
 * These utilities make it easy to integrate RBAC checks into
 * request handlers, middleware chains, and framework-agnostic guards.
 */

import type {
    Permission,
    RBACContext,
    GuardFn,
    HandlerFn,
    DenyHandlerFn,
} from './types.js';
import { RBACManager } from './rbac.js';
import { PermissionDeniedError } from './errors.js';

// ---------------------------------------------------------------------------
// Guard factories
// ---------------------------------------------------------------------------

/**
 * Creates a guard function that checks a single permission.
 *
 * @example
 * const canDeletePosts = createPermissionGuard(rbac, 'posts:delete');
 * if (!canDeletePosts(ctx)) throw new PermissionDeniedError('posts:delete', ctx.roles);
 */
export function createPermissionGuard(
    rbac: RBACManager,
    permission: Permission
): GuardFn {
    return (context: RBACContext) => rbac.can(context, permission);
}

/**
 * Creates a guard function that checks whether the context has a specific role.
 *
 * @example
 * const isAdmin = createRoleGuard(rbac, 'admin');
 * if (!isAdmin(ctx)) throw new PermissionDeniedError('admin role', ctx.roles);
 */
export function createRoleGuard(
    rbac: RBACManager,
    roleName: string
): GuardFn {
    return (context: RBACContext) => rbac.hasRole(context, roleName);
}

/**
 * Creates a guard that requires ALL of the given permissions.
 *
 * @example
 * const canManagePosts = createAllPermissionsGuard(rbac, ['posts:read', 'posts:delete']);
 */
export function createAllPermissionsGuard(
    rbac: RBACManager,
    permissions: Permission[]
): GuardFn {
    return (context: RBACContext) => rbac.hasAllPermissions(context, permissions);
}

/**
 * Creates a guard that requires AT LEAST ONE of the given permissions.
 *
 * @example
 * const canViewContent = createAnyPermissionGuard(rbac, ['posts:read', 'drafts:read']);
 */
export function createAnyPermissionGuard(
    rbac: RBACManager,
    permissions: Permission[]
): GuardFn {
    return (context: RBACContext) => rbac.hasAnyPermission(context, permissions);
}

// ---------------------------------------------------------------------------
// Handler wrappers
// ---------------------------------------------------------------------------

/**
 * Wraps a handler function with a permission check.
 * Calls `onDenied` (or throws `PermissionDeniedError`) if the check fails.
 *
 * @example
 * const deletePost = withPermission(
 *   rbac,
 *   'posts:delete',
 *   async (ctx) => { await db.posts.delete(ctx.postId); },
 *   (ctx, perm) => { throw new Error(`Forbidden: ${perm}`); }
 * );
 */
export function withPermission<TContext extends { rbac: RBACContext }, TResult>(
    rbac: RBACManager,
    permission: Permission,
    handler: HandlerFn<TContext, TResult>,
    onDenied?: DenyHandlerFn<TContext, TResult>
): HandlerFn<TContext, TResult> {
    return async (context: TContext): Promise<TResult> => {
        if (rbac.cannot(context.rbac, permission)) {
            if (onDenied) {
                return onDenied(context, permission);
            }
            throw new PermissionDeniedError(permission, context.rbac.roles);
        }
        return handler(context);
    };
}

// ---------------------------------------------------------------------------
// Express / Next.js-style middleware factory
// ---------------------------------------------------------------------------

/**
 * Represents a minimal Express/Next.js-style request with an `rbacContext` property.
 * Attach an `RBACContext` to your request object before using this middleware.
 */
export interface RBACRequest {
    rbacContext?: RBACContext;
}

/**
 * Express/Next.js-compatible middleware factory.
 * Expects `req.rbacContext` to be populated by a preceding auth middleware.
 *
 * @example
 * // Express
 * app.delete('/posts/:id', requirePermission(rbac, 'posts:delete'), deletePostHandler);
 *
 * @example
 * // Next.js API route (pages router)
 * export default requirePermission(rbac, 'posts:delete')(handler);
 */
export function requirePermission(
    rbac: RBACManager,
    permission: Permission
) {
    return function middleware(
        req: RBACRequest,
        res: { status: (code: number) => { json: (body: unknown) => void } },
        next: () => void
    ): void {
        const context = req.rbacContext;

        if (!context) {
            res.status(401).json({
                error: 'Unauthorized',
                message: 'No RBAC context found on request. Ensure auth middleware runs first.',
            });
            return;
        }

        if (rbac.cannot(context, permission)) {
            res.status(403).json({
                error: 'Forbidden',
                message: `Permission denied: "${permission}" is required.`,
                roles: context.roles,
            });
            return;
        }

        next();
    };
}

/**
 * Express/Next.js-compatible middleware factory for role checks.
 *
 * @example
 * app.get('/admin', requireRole(rbac, 'admin'), adminHandler);
 */
export function requireRole(rbac: RBACManager, roleName: string) {
    return function middleware(
        req: RBACRequest,
        res: { status: (code: number) => { json: (body: unknown) => void } },
        next: () => void
    ): void {
        const context = req.rbacContext;

        if (!context) {
            res.status(401).json({
                error: 'Unauthorized',
                message: 'No RBAC context found on request.',
            });
            return;
        }

        if (!rbac.hasRole(context, roleName)) {
            res.status(403).json({
                error: 'Forbidden',
                message: `Role "${roleName}" is required.`,
                roles: context.roles,
            });
            return;
        }

        next();
    };
}
