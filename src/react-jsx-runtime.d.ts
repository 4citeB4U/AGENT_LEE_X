// Temporary module declaration to satisfy TS until @types/react provides jsx-runtime for React 19.
// Can be removed once @types/react@19 is available or project migrates to the official types.
// This keeps strict mode happy.

declare module 'react/jsx-runtime' {
  export const Fragment: any;
  const jsx: any;
  const jsxs: any;
  const jsxDEV: any;
  export { jsx, jsxDEV, jsxs };
}
