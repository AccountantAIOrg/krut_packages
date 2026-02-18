/**
 * Role and permission definition helpers for @krutai/rbac
 */

import type { Role, Permission } from './types.js';

/**
 * Type-safe helper to define a role.
 * Useful for getting autocomplete and validation when building role configs.
 *
 * @example
 * const editorRole = defineRole({
 *   name: 'editor',
 *   permissions: ['posts:read', 'posts:write'],
 *   inherits: ['user'],
 * });
 */
export function defineRole(config: Role): Role {
    return config;
}

/**
 * Creates a typed permission string in the format "resource:action".
 *
 * @example
 * const canReadPosts = definePermission('posts', 'read'); // "posts:read"
 * const canDeleteUsers = definePermission('users', 'delete'); // "users:delete"
 */
export function definePermission(resource: string, action: string): Permission {
    return `${resource}:${action}`;
}

/**
 * Creates a set of CRUD permissions for a given resource.
 *
 * @example
 * const postPermissions = crudPermissions('posts');
 * // ["posts:create", "posts:read", "posts:update", "posts:delete"]
 */
export function crudPermissions(resource: string): Permission[] {
    return [
        `${resource}:create`,
        `${resource}:read`,
        `${resource}:update`,
        `${resource}:delete`,
    ];
}

/**
 * Creates a wildcard permission for a resource (grants all actions).
 *
 * @example
 * wildcardPermission('posts') // "posts:*"
 */
export function wildcardPermission(resource: string): Permission {
    return `${resource}:*`;
}

// ---------------------------------------------------------------------------
// Pre-built common roles
// ---------------------------------------------------------------------------

/**
 * Guest role — read-only access to public resources
 */
export const GUEST_ROLE: Role = defineRole({
    name: 'guest',
    description: 'Unauthenticated or anonymous user with read-only public access',
    permissions: ['public:read'],
});

/**
 * User role — standard authenticated user
 */
export const USER_ROLE: Role = defineRole({
    name: 'user',
    description: 'Standard authenticated user',
    inherits: ['guest'],
    permissions: [
        'profile:read',
        'profile:update',
        'posts:read',
        'posts:create',
        'comments:read',
        'comments:create',
    ],
});

/**
 * Moderator role — can manage user-generated content
 */
export const MODERATOR_ROLE: Role = defineRole({
    name: 'moderator',
    description: 'Can review and moderate user-generated content',
    inherits: ['user'],
    permissions: [
        'posts:update',
        'posts:delete',
        'comments:update',
        'comments:delete',
        'users:read',
    ],
});

/**
 * Admin role — full control over application resources
 */
export const ADMIN_ROLE: Role = defineRole({
    name: 'admin',
    description: 'Administrator with full control over application resources',
    inherits: ['moderator'],
    permissions: [
        'users:create',
        'users:update',
        'users:delete',
        'roles:read',
        'roles:assign',
        'settings:read',
        'settings:update',
    ],
});

/**
 * Super Admin role — unrestricted access to everything
 */
export const SUPER_ADMIN_ROLE: Role = defineRole({
    name: 'super_admin',
    description: 'Unrestricted access to all resources and actions',
    inherits: ['admin'],
    permissions: [
        wildcardPermission('*'),  // grants all permissions
        'roles:create',
        'roles:delete',
        'settings:delete',
        'system:manage',
    ],
});

/**
 * All pre-built roles in hierarchy order (least → most privileged)
 */
export const DEFAULT_ROLES: Role[] = [
    GUEST_ROLE,
    USER_ROLE,
    MODERATOR_ROLE,
    ADMIN_ROLE,
    SUPER_ADMIN_ROLE,
];
