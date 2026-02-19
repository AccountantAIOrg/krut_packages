import { defineConfig } from 'tsup';

export default defineConfig([
    {
        entry: { index: 'src/index.ts' },
        format: ['cjs', 'esm'],
        dts: true,
        splitting: false,
        sourcemap: true,
        clean: true,
        treeshake: true,
        minify: false,
        // @openrouter/sdk, ai, and krutai are real dependencies — keep them external
        external: ['@openrouter/sdk', 'krutai'],
    },
]);
