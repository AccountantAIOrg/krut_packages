/**
 * Example: @krutai/rbac usage
 *
 * Run with: npx ts-node --esm examples/rbac-usage.ts
 * Or after build: node --input-type=module < examples/rbac-usage.ts
 */

import {
    RBACManager,
    defineRole,
    definePermission,
    crudPermissions,
    wildcardPermission,
    DEFAULT_ROLES,
    createPermissionGuard,
    createRoleGuard,
    PermissionDeniedError,
} from '../packages/rbac/src/index.js';

// ---------------------------------------------------------------------------
// 1. Basic setup with custom roles
// ---------------------------------------------------------------------------

const rbac = new RBACManager({
    roles: [
        defineRole({
            name: 'viewer',
            description: 'Read-only access',
            permissions: ['posts:read', 'comments:read'],
        }),
        defineRole({
            name: 'author',
            description: 'Can create and edit own content',
            inherits: ['viewer'],
            permissions: ['posts:create', 'posts:update', 'comments:create'],
        }),
        defineRole({
            name: 'editor',
            description: 'Can manage all content',
            inherits: ['author'],
            permissions: [...crudPermissions('posts'), ...crudPermissions('comments')],
        }),
        defineRole({
            name: 'admin',
            description: 'Full control',
            inherits: ['editor'],
            permissions: [wildcardPermission('users'), 'settings:manage'],
        }),
    ],
    defaultRole: 'viewer',
});

// ---------------------------------------------------------------------------
// 2. User contexts
// ---------------------------------------------------------------------------

const viewerCtx = { userId: 'u1', roles: ['viewer'] };
const authorCtx = { userId: 'u2', roles: ['author'] };
const editorCtx = { userId: 'u3', roles: ['editor'] };
const adminCtx = { userId: 'u4', roles: ['admin'] };
const guestCtx = { userId: undefined, roles: [] }; // will use defaultRole: viewer

// ---------------------------------------------------------------------------
// 3. Basic permission checks
// ---------------------------------------------------------------------------

console.log('\n=== Basic Permission Checks ===');
console.log('viewer  can posts:read?   ', rbac.can(viewerCtx, 'posts:read'));    // true
console.log('viewer  can posts:create? ', rbac.can(viewerCtx, 'posts:create'));  // false
console.log('author  can posts:create? ', rbac.can(authorCtx, 'posts:create'));  // true
console.log('author  can posts:delete? ', rbac.can(authorCtx, 'posts:delete'));  // false
console.log('editor  can posts:delete? ', rbac.can(editorCtx, 'posts:delete'));  // true
console.log('admin   can users:delete? ', rbac.can(adminCtx, 'users:delete'));  // true (wildcard)
console.log('guest   can posts:read?   ', rbac.can(guestCtx, 'posts:read'));    // true (defaultRole)

// ---------------------------------------------------------------------------
// 4. Role checks
// ---------------------------------------------------------------------------

console.log('\n=== Role Checks ===');
console.log('admin   hasRole admin?    ', rbac.hasRole(adminCtx, 'admin'));      // true
console.log('editor  hasRole admin?    ', rbac.hasRole(editorCtx, 'admin'));     // false
console.log('admin   hasAnyRole [editor, admin]?', rbac.hasAnyRole(adminCtx, ['editor', 'admin'])); // true

// ---------------------------------------------------------------------------
// 5. Multiple permission checks
// ---------------------------------------------------------------------------

console.log('\n=== Multiple Permission Checks ===');
const postPerms = ['posts:read', 'posts:create', 'posts:delete'];
console.log('editor hasAllPermissions posts CRUD?', rbac.hasAllPermissions(editorCtx, postPerms)); // true
console.log('author hasAllPermissions posts CRUD?', rbac.hasAllPermissions(authorCtx, postPerms)); // false
console.log('author hasAnyPermission posts CRUD?', rbac.hasAnyPermission(authorCtx, postPerms));  // true

// ---------------------------------------------------------------------------
// 6. Detailed check result
// ---------------------------------------------------------------------------

console.log('\n=== Detailed Check ===');
const result = rbac.check(authorCtx, ['posts:create', 'posts:delete'], { requireAll: true });
console.log('Granted:', result.granted);   // false
console.log('Missing:', result.missing);   // ['posts:delete']

// ---------------------------------------------------------------------------
// 7. Guard factories
// ---------------------------------------------------------------------------

console.log('\n=== Guards ===');
const canDeletePosts = createPermissionGuard(rbac, 'posts:delete');
const isAdmin = createRoleGuard(rbac, 'admin');

console.log('canDeletePosts(editor):', canDeletePosts(editorCtx)); // true
console.log('canDeletePosts(author):', canDeletePosts(authorCtx)); // false
console.log('isAdmin(admin):        ', isAdmin(adminCtx));         // true
console.log('isAdmin(editor):       ', isAdmin(editorCtx));        // false

// ---------------------------------------------------------------------------
// 8. definePermission helper
// ---------------------------------------------------------------------------

console.log('\n=== Permission Helpers ===');
const canReadPosts = definePermission('posts', 'read');
console.log('definePermission result:', canReadPosts); // "posts:read"
console.log('crudPermissions(tags):  ', crudPermissions('tags'));
console.log('wildcardPermission(api):', wildcardPermission('api'));

// ---------------------------------------------------------------------------
// 9. Error handling
// ---------------------------------------------------------------------------

console.log('\n=== Error Handling ===');
try {
    if (rbac.cannot(viewerCtx, 'posts:delete')) {
        throw new PermissionDeniedError('posts:delete', viewerCtx.roles);
    }
} catch (err) {
    if (err instanceof PermissionDeniedError) {
        console.log('Caught:', err.message);
        console.log('Permission:', err.permission);
        console.log('Roles:', err.roles);
    }
}

// ---------------------------------------------------------------------------
// 10. Using DEFAULT_ROLES
// ---------------------------------------------------------------------------

console.log('\n=== Default Roles ===');
const defaultRbac = new RBACManager({ roles: DEFAULT_ROLES });
const superAdmin = { roles: ['super_admin'] };
console.log('super_admin can *:*?    ', defaultRbac.can(superAdmin, 'anything:everything')); // true
console.log('Available roles:', defaultRbac.getAllRoles().map(r => r.name));

console.log('\n✅ All examples completed successfully!');
