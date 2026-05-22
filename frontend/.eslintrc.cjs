module.exports = {
    root: true,
    env: { browser: true, es2021: true },
    extends: [
        'eslint:recommended',
        'plugin:react/recommended',
        'plugin:react-hooks/recommended',
        'plugin:jsx-a11y/recommended',
        'plugin:import/recommended',
        'plugin:import/typescript',
        'prettier'
    ],
    parser: '@typescript-eslint/parser',
    plugins: ['react', 'react-hooks', 'jsx-a11y', 'import', 'unused-imports'],
    rules: {
        'react/react-in-jsx-scope': 'off',
        'unused-imports/no-unused-imports': 'warn',
        'import/order': ['warn', { 'alphabetize': { order: 'asc' } }]
    },
    settings: {
        react: { version: 'detect' }
    }
}
