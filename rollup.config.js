import commonjs from 'rollup-plugin-commonjs';

export default {
  input: 'src/index.js',
  output: {
    file: 'lib/bundle.cjs.js',
    format: 'cjs',
    name: 'opaqueRefreshLink',
    globals: {},
    sourcemap: true,
    exports: 'named',
  },
  external: [ '@apollo/client' ],
  plugins: [ commonjs() ],
};
