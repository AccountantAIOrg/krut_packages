/**
 * @krutai/rbac — Role-Based Access Control for KrutAI
 *
 * A flexible, type-safe RBAC library with role inheritance,
 * wildcard permissions, and framework-agnostic guard helpers.
 *
 * @packageDocumentation
 */

// Core manager
export { RBACManager } from './rbac.js';

// Types
export type {
    Permission,
    Role,
    RBACConfig,
    RBACContext,
    CheckOptions,
    PermissionCheckResult,
    GuardFn,
    HandlerFn,
    DenyHandlerFn,
} from './types.js';

// Role & permission helpers
export {
    defineRole,
    definePermission,
    crudPermissions,
    wildcardPermission,
    // Pre-built roles
    GUEST_ROLE,
    USER_ROLE,
    MODERATOR_ROLE,
    ADMIN_ROLE,
    SUPER_ADMIN_ROLE,
    DEFAULT_ROLES,
} from './role.js';

// Guard & middleware helpers
export {
    createPermissionGuard,
    createRoleGuard,
    createAllPermissionsGuard,
    createAnyPermissionGuard,
    withPermission,
    requirePermission,
    requireRole,
} from './guards.js';
export type { RBACRequest } from './guards.js';

// Errors
export {
    RBACError,
    PermissionDeniedError,
    RoleNotFoundError,
    CircularInheritanceError,
} from './errors.js';

// Re-export validator utilities from krutai peer dependency
export {
    validateApiKeyFormat,
    validateApiKeyWithService,
    validateApiKey,
    createApiKeyChecker,
    ApiKeyValidationError,
    KrutAIKeyValidationError,
} from 'krutai';

// Package metadata
export const VERSION = '0.1.0';
