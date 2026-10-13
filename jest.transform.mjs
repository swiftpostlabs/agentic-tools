// Jest transform that strips TypeScript types with Node's own stripper, so tests run the same
// erasable-only TypeScript that Node executes directly, with no ts-jest or Babel.
import { stripTypeScriptTypes } from 'node:module';

const typeScriptFile = /\.m?ts$/;

export default {
  process(source, filename) {
    if (!typeScriptFile.test(filename)) {
      return { code: source };
    }
    return {
      code: stripTypeScriptTypes(source, {
        mode: 'strip',
        sourceUrl: filename,
      }),
    };
  },
};
