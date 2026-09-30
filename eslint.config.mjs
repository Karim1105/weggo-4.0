import nextVitals from 'eslint-config-next/core-web-vitals'

export default [
  ...nextVitals,
  {
    ignores: [
      '.next/**',
      'coverage/**',
      'dist/**',
      'node_modules/**',
      'public/uploads/**',
    ],
  },
  {
    rules: {
      '@next/next/no-img-element': 'warn',
      'react/no-unescaped-entities': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/set-state-in-effect': 'off',
      // The CSP blocks inline scripts without the per-request nonce. Use
      // components/NonceScript (or next/script) instead of a raw <script>.
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXOpeningElement[name.name='script']",
          message: 'Use <NonceScript> from @/components/NonceScript so the script carries the CSP nonce.',
        },
      ],
    },
  },
]
