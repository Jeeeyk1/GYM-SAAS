export default {
  displayName: 'mobile',
  preset: 'jest-expo',
  transform: { '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }] },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../../coverage/apps/mobile',
  moduleNameMapper: {
    '^@gym-saas/shared-types$': '<rootDir>/../../libs/shared-types/src/index.ts',
    '^@gym-saas/shared-utils$': '<rootDir>/../../libs/shared-utils/src/index.ts',
    '^@gym-saas/shared-config$': '<rootDir>/../../libs/shared-config/src/index.ts',
  },
};