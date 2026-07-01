export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // 强制要求包含作用域 (scope)
    // 0: disable, 1: warning, 2: error
    // 'always': 始终应用此规则
    'scope-empty': [2, 'never'],
  },
};
