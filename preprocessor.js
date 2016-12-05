const tsc = require('typescript');
const babelJest = require('babel-jest');

module.exports = {
  process(src, path) {
    if (path.endsWith('.ts') || path.endsWith('.tsx')) {
      return tsc.transpile(
        src,
        {
          module: tsc.ModuleKind.CommonJS,
        },
        path,
        []
      );
    }
    if (path.endsWith('.js') || path.endsWith('.jsx')) {
      return babelJest.process(src, path);
    }
    return src;
  },
};
