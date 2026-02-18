/**
 * Custom error classes for @krutai/rbac
 */

/**
 * Base error class for all RBAC-related errors
 */
export class RBACError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'RBACError';
        // Maintain proper prototype chain in transpiled environments
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

/**
 * Thrown when a user lacks the required permission to perform an action
 */
export class PermissionDeniedError extends RBACError {
    /** The permission that was required but not held */
    public readonly permission: string;
    /** The roles that were evaluated */
    public readonly roles: string[];

    constructor(permission: string, roles: string[]) {
        super(
            `Permission denied: "${permission}" is required. ` +
            `User has roles: [${roles.join(', ') || 'none'}]`
        );
        this.name = 'PermissionDeniedError';
        this.permission = permission;
        this.roles = roles;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

/**
 * Thrown when a referenced role does not exist in the registry
 */
export class RoleNotFoundError extends RBACError {
    /** The name of the role that was not found */
    public readonly roleName: string;

    constructor(roleName: string) {
        super(`Role not found: "${roleName}"`);
        this.name = 'RoleNotFoundError';
        this.roleName = roleName;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

/**
 * Thrown when a circular inheritance chain is detected in role definitions
 */
export class CircularInheritanceError extends RBACError {
    /** The chain of roles that form the cycle */
    public readonly chain: string[];

    constructor(chain: string[]) {
        super(`Circular role inheritance detected: ${chain.join(' → ')}`);
        this.name = 'CircularInheritanceError';
        this.chain = chain;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
