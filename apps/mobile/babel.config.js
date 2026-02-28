module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          alias: {
            '@gym-saas/shared-types': '../../libs/shared-types/src/index.ts',
            '@gym-saas/shared-utils': '../../libs/shared-utils/src/index.ts',
            '@gym-saas/shared-config': '../../libs/shared-config/src/index.ts',
          },
        },
      ],
    ],
  };
};