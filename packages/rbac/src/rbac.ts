/**
 * RBACManager — core class for role-based access control
 */

import type {
    Role,
    Permission,
    RBACConfig,
    RBACContext,
    CheckOptions,
    PermissionCheckResult,
} from './types.js';
import { RoleNotFoundError, CircularInheritanceError } from './errors.js';

/**
 * The main RBAC engine. Manages roles, resolves inheritance chains,
 * and evaluates permission checks against a user context.
 *
 * @example
 * const rbac = new RBACManager({
 *   roles: [
 *     { name: 'user', permissions: ['posts:read'] },
 *     { name: 'admin', permissions: ['posts:delete'], inherits: ['user'] },
 *   ],
 * });
 *
 * const ctx = { roles: ['admin'] };
 * rbac.can(ctx, 'posts:read');   // true (inherited from user)
 * rbac.can(ctx, 'posts:delete'); // true
 * rbac.can(ctx, 'users:manage'); // false
 */
export class RBACManager {
    private readonly roles: Map<string, Role> = new Map();
    private readonly defaultRole?: string;
    /** Cache of resolved permissions per role to avoid repeated traversal */
    private readonly permissionCache: Map<string, Set<Permission>> = new Map();

    constructor(config: RBACConfig) {
        this.defaultRole = config.defaultRole;
        for (const role of config.roles) {
            this.roles.set(role.name, role);
        }
    }

    // -------------------------------------------------------------------------
    // Role Management
    // -------------------------------------------------------------------------

    /**
     * Register a new role. Clears the permission cache.
     */
    addRole(role: Role): void {
        this.roles.set(role.name, role);
        this.permissionCache.clear();
    }

    /**
     * Remove a role by name. Clears the permission cache.
     * @throws {RoleNotFoundError} if the role does not exist
     */
    removeRole(name: string): void {
        if (!this.roles.has(name)) {
            throw new RoleNotFoundError(name);
        }
        this.roles.delete(name);
        this.permissionCache.clear();
    }

    /**
     * Retrieve a role definition by name.
     */
    getRole(name: string): Role | undefined {
        return this.roles.get(name);
    }

    /**
     * Returns all registered roles as an array.
     */
    getAllRoles(): Role[] {
        return Array.from(this.roles.values());
    }

    // -------------------------------------------------------------------------
    // Permission Resolution
    // -------------------------------------------------------------------------

    /**
     * Resolves the full set of permissions for a single role,
     * including all inherited permissions (with cycle detection).
     *
     * @throws {RoleNotFoundError} if the role does not exist
     * @throws {CircularInheritanceError} if a circular inheritance chain is detected
     */
    getPermissionsForRole(roleName: string): Set<Permission> {
        if (!this.roles.has(roleName)) {
            throw new RoleNotFoundError(roleName);
        }
        if (this.permissionCache.has(roleName)) {
            return this.permissionCache.get(roleName)!;
        }
        const resolved = this.resolvePermissions(roleName, []);
        this.permissionCache.set(roleName, resolved);
        return resolved;
    }

    /**
     * Resolves the union of all permissions across multiple roles.
     */
    getPermissionsForRoles(roleNames: string[]): Set<Permission> {
        const combined = new Set<Permission>();
        for (const name of roleNames) {
            for (const perm of this.getPermissionsForRole(name)) {
                combined.add(perm);
            }
        }
        return combined;
    }

    // -------------------------------------------------------------------------
    // Permission Checks
    // -------------------------------------------------------------------------

    /**
     * Check whether the context has a specific permission.
     * Supports wildcard permissions (e.g. "*:*" or "posts:*").
     */
    hasPermission(
        context: RBACContext,
        permission: Permission,
        _opts?: CheckOptions
    ): boolean {
        const roles = this.resolveContextRoles(context);
        const userPerms = this.getPermissionsForRoles(roles);
        return this.matchPermission(userPerms, permission);
    }

    /**
     * Check whether the context has AT LEAST ONE of the given permissions.
     */
    hasAnyPermission(context: RBACContext, permissions: Permission[]): boolean {
        return permissions.some((p) => this.hasPermission(context, p));
    }

    /**
     * Check whether the context has ALL of the given permissions.
     */
    hasAllPermissions(context: RBACContext, permissions: Permission[]): boolean {
        return permissions.every((p) => this.hasPermission(context, p));
    }

    /**
     * Check whether the context has a specific role assigned.
     */
    hasRole(context: RBACContext, roleName: string): boolean {
        const roles = this.resolveContextRoles(context);
        return roles.includes(roleName);
    }

    /**
     * Check whether the context has AT LEAST ONE of the given roles.
     */
    hasAnyRole(context: RBACContext, roleNames: string[]): boolean {
        return roleNames.some((r) => this.hasRole(context, r));
    }

    /**
     * Alias for `hasPermission`. Reads naturally in conditional expressions.
     *
     * @example
     * if (rbac.can(ctx, 'posts:delete')) { ... }
     */
    can(context: RBACContext, permission: Permission): boolean {
        return this.hasPermission(context, permission);
    }

    /**
     * Inverse of `can`. Reads naturally in guard expressions.
     *
     * @example
     * if (rbac.cannot(ctx, 'posts:delete')) throw new PermissionDeniedError(...);
     */
    cannot(context: RBACContext, permission: Permission): boolean {
        return !this.hasPermission(context, permission);
    }

    /**
     * Detailed permission check that returns a result object with context.
     */
    check(
        context: RBACContext,
        permissions: Permission[],
        opts: CheckOptions = {}
    ): PermissionCheckResult {
        const { requireAll = false } = opts;
        const roles = this.resolveContextRoles(context);
        const userPerms = this.getPermissionsForRoles(roles);

        const missing = permissions.filter(
            (p) => !this.matchPermission(userPerms, p)
        );

        const granted = requireAll
            ? missing.length === 0
            : missing.length < permissions.length;

        return {
            granted,
            permissions,
            roles,
            missing: missing.length > 0 ? missing : undefined,
        };
    }

    // -------------------------------------------------------------------------
    // Private Helpers
    // -------------------------------------------------------------------------

    private resolveContextRoles(context: RBACContext): string[] {
        if (context.roles.length === 0 && this.defaultRole) {
            return [this.defaultRole];
        }
        return context.roles;
    }

    private resolvePermissions(
        roleName: string,
        visited: string[]
    ): Set<Permission> {
        if (visited.includes(roleName)) {
            throw new CircularInheritanceError([...visited, roleName]);
        }

        const role = this.roles.get(roleName);
        if (!role) {
            throw new RoleNotFoundError(roleName);
        }

        const perms = new Set<Permission>(role.permissions);
        const nextVisited = [...visited, roleName];

        for (const parentName of role.inherits ?? []) {
            for (const perm of this.resolvePermissions(parentName, nextVisited)) {
                perms.add(perm);
            }
        }

        return perms;
    }

    /**
     * Matches a required permission against the user's permission set,
     * supporting wildcard segments ("*").
     *
     * Wildcard rules:
     * - "*:*"       matches everything
     * - "posts:*"   matches any action on "posts"
     * - "*:read"    matches "read" on any resource
     */
    private matchPermission(
        userPerms: Set<Permission>,
        required: Permission
    ): boolean {
        // Exact match
        if (userPerms.has(required)) return true;

        // Global wildcard
        if (userPerms.has('*:*') || userPerms.has('*')) return true;

        const [reqResource, reqAction] = required.split(':');

        for (const perm of userPerms) {
            const [permResource, permAction] = perm.split(':');

            const resourceMatch =
                permResource === '*' || permResource === reqResource;
            const actionMatch =
                permAction === '*' || permAction === reqAction;

            if (resourceMatch && actionMatch) return true;
        }

        return false;
    }
}
