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
        // krutai is a peer dep — keep it external. No other external deps needed.
        external: ['krutai'],
    },
]);
