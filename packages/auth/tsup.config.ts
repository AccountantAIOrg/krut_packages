import { defineConfig } from 'tsup';

export default defineConfig([
    // Main index bundle — bundles better-auth server-side code + krutai validator
    {
        entry: { index: 'src/index.ts' },
        format: ['cjs', 'esm'],
        dts: true,
        splitting: false,
        sourcemap: true,
        clean: true,
        treeshake: true,
        minify: false,
        // Bundle better-auth and krutai into the output
        noExternal: ['better-auth', 'krutai'],
        // Keep Node.js built-ins and framework peers external
        external: ['react', 'react-dom', 'next'],
    },
    // React client bundle — bundles better-auth/react, keeps react external (peer dep)
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
]);
