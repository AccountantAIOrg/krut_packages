/**
 * Core type definitions for @krutai/rbac
 */

/**
 * A permission string in the format "resource:action"
 * Examples: "posts:read", "users:delete", "admin:manage"
 */
export type Permission = string;

/**
 * A role definition with its associated permissions and optional inheritance
 */
export interface Role {
    /** Unique name for this role */
    name: string;
    /** List of permissions granted to this role */
    permissions: Permission[];
    /** Names of roles whose permissions this role inherits */
    inherits?: string[];
    /** Human-readable description of this role */
    description?: string;
}

/**
 * Configuration for the RBACManager
 */
export interface RBACConfig {
    /** Initial set of roles to register */
    roles: Role[];
    /** Name of the role assigned to users with no explicit role */
    defaultRole?: string;
}

/**
 * Options for permission checks
 */
export interface CheckOptions {
    /**
     * When checking multiple permissions:
     * - true  → user must have ALL permissions (AND)
     * - false → user must have AT LEAST ONE permission (OR)
     * @default false
     */
    requireAll?: boolean;
}

/**
 * The context object representing the current user/request being checked
 */
export interface RBACContext {
    /** Optional identifier for the user */
    userId?: string;
    /** List of role names assigned to this user */
    roles: string[];
    /** Optional arbitrary metadata for custom logic */
    metadata?: Record<string, unknown>;
}

/**
 * Result of a permission check with additional details
 */
export interface PermissionCheckResult {
    /** Whether the check passed */
    granted: boolean;
    /** The permission(s) that were checked */
    permissions: Permission[];
    /** The roles that were evaluated */
    roles: string[];
    /** Which permissions were missing (if denied) */
    missing?: Permission[];
}

/**
 * A guard function that takes a context and returns whether access is granted
 */
export type GuardFn = (context: RBACContext) => boolean;

/**
 * A middleware-style handler function
 */
export type HandlerFn<TContext = unknown, TResult = unknown> = (
    context: TContext
) => TResult | Promise<TResult>;

/**
 * A middleware-style deny handler
 */
export type DenyHandlerFn<TContext = unknown, TResult = unknown> = (
    context: TContext,
    permission: Permission
) => TResult | Promise<TResult>;
