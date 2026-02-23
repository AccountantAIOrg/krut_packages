#!/usr/bin/env node
/**
 * @krutai/auth — postinstall migration script
 *
 * Automatically creates (or updates) the SQLite database tables
 * required by Better Auth. Runs after `npm install @krutai/auth`.
 *
 * The database file is placed at the project root as `sqlite.db`.
 * Set BETTER_AUTH_DB_PATH to override the location.
 * Set SKIP_KRUTAI_MIGRATE=1 to skip this script entirely.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Allow opt-out
if (process.env.SKIP_KRUTAI_MIGRATE === '1') {
    console.log('[krutai/auth] Skipping migration (SKIP_KRUTAI_MIGRATE=1)');
    process.exit(0);
}

// Determine project root (where the consuming project's package.json lives)
// When postinstall runs under node_modules/@krutai/auth, we go up 3 levels.
const projectRoot = path.resolve(__dirname, '..', '..', '..', '..');

// Fallback: if we're being run from within the monorepo itself, use cwd
const packageJson = path.join(projectRoot, 'package.json');
const root = fs.existsSync(packageJson) ? projectRoot : process.cwd();

const dbPath = process.env.BETTER_AUTH_DB_PATH ?? path.join(root, 'sqlite.db');

console.log('[krutai/auth] Running Better Auth SQLite migration...');
console.log(`[krutai/auth] Database: ${dbPath}`);

try {
    // better-auth provides a CLI via `npx better-auth migrate`
    // Pass the db path via env so it's picked up automatically
    execSync('npx better-auth migrate --yes', {
        cwd: root,
        stdio: 'inherit',
        env: {
            ...process.env,
            BETTER_AUTH_DB_PATH: dbPath,
            BETTER_AUTH_DATABASE_URL: `file:${dbPath}`,
        },
    });
    console.log('[krutai/auth] Migration complete. SQLite tables are ready.');
} catch (err) {
    // Don't fail the install — the user may not have a lib/auth.ts yet
    console.warn('[krutai/auth] Migration skipped or failed (this is OK if you have not created lib/auth.ts yet).');
    console.warn('[krutai/auth] Run `npx better-auth migrate` manually after setting up your auth config.');
}
