import { defineConfig } from 'tsup';

export default defineConfig([
    // Main server-side bundle
    {
        entry: { index: 'src/index.ts' },
        format: ['cjs', 'esm'],
        dts: true,
        splitting: false,
        sourcemap: true,
        clean: true,
        treeshake: true,
        minify: false,
        // better-auth, krutai, better-sqlite3 are real dependencies — keep them external
        // so consumers get proper types and tree-shaking
        external: ['react', 'react-dom', 'next', 'better-sqlite3', 'better-auth', 'krutai', '@prisma/client', 'drizzle-orm', 'mysql2', 'pg', 'mongodb'],
    },
    // React client bundle
    {
        entry: { react: 'src/react.ts' },
        format: ['cjs', 'esm'],
        dts: true,
        splitting: false,
        sourcemap: true,
        clean: false,
        treeshake: true,
        minify: false,
        external: ['react', 'react-dom', 'next', 'better-auth'],
    },
    // Next.js handler bundle (toNextJsHandler)
    {
        entry: { 'next-js': 'src/next-js.ts' },
        format: ['cjs', 'esm'],
        dts: true,
        splitting: false,
        sourcemap: true,
        clean: false,
        treeshake: true,
        minify: false,
        external: ['react', 'react-dom', 'next', 'better-sqlite3', 'better-auth', '@prisma/client', 'drizzle-orm', 'mysql2', 'pg', 'mongodb'],
    },
]);
