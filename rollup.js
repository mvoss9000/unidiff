const {rollup} = require('rollup');
const resolve = require('rollup-plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');
const {terser} = require('rollup-plugin-terser');

const inputOptions = {
    input: 'unidiff.js',
    plugins: [
        resolve({main: true, module: true}),
        commonjs(),
        terser()
    ]
};

const build = async () => {
    const bundle = await rollup(inputOptions);

    bundle.write({format: 'umd', name: 'unidiff', file: 'dist/index.js', sourcemap: true, exports: 'named'});
};

build();
