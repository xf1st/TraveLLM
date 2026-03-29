import next from "eslint-config-next"

/** Native flat config from eslint-config-next (ESLint 9+). */
export default [
  {
    ignores: [
      ".agent/**",
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  ...next,
  {
    /** React Compiler rules: useful but noisy until refactors; keep hooks/rules-of-hooks strict. */
    rules: {
      "react/no-unescaped-entities": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/refs": "warn",
      "@next/next/no-img-element": "warn",
    },
  },
]
