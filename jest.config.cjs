module.exports = {
  roots: ['<rootDir>/src'],
  testEnvironment: 'jsdom',
  resetMocks: true,
  fakeTimers: { doNotFake: ['performance'] },
  setupFilesAfterEnv: ['<rootDir>/tests/browserSetup.cjs'],
  transform: {
    '^.+\\.[jt]sx?$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        ['@babel/preset-react', { runtime: 'automatic' }],
        '@babel/preset-typescript',
      ],
    }],
  },
  transformIgnorePatterns: ['/node_modules/(?!@ui-sdk/)'],
  moduleNameMapper: { '\\.css$': '<rootDir>/tests/styleStub.cjs' },
};
