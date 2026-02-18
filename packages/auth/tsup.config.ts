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
        noExternal: ['better-auth', 'krutai'],
        external: ['react', 'react-dom', 'next', 'better-sqlite3', '@prisma/client', 'drizzle-orm', 'mysql2', 'pg', 'mongodb'],
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
        noExternal: ['better-auth'],
        external: ['react', 'react-dom', 'next'],
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
        noExternal: ['better-auth'],
        external: ['react', 'react-dom', 'next', 'better-sqlite3', '@prisma/client', 'drizzle-orm', 'mysql2', 'pg', 'mongodb'],
    },
]);
