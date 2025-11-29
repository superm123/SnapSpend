const JSDOMEnvironment = require('jest-environment-jsdom').default;

class CustomTestEnvironment extends JSDOMEnvironment {
  constructor(config, context) {
    super(config, context);
    this.testPath = context.testPath;
    this.docblockPragmas = context.docblockPragmas;
  }

  async setup() {
    await super.setup();
    // Set NODE_ENV for testing and mock process functions needed by Jest Circus
    this.global.process = {
      ...this.global.process,
      env: {
        ...this.global.process.env,
        NODE_ENV: 'test',
      },
      // Mock these functions for jest-circus compatibility
      listeners: (eventName) => [],
      on: (eventName, listener) => {},
      off: (eventName, listener) => {},
      removeListener: (eventName, listener) => {},
      addListener: (eventName, listener) => {},
    };

    // Explicitly mock localStorage to prevent SecurityError
    Object.defineProperty(this.global, 'localStorage', {
      value: {
        getItem: (key) => null,
        setItem: (key, value) => {},
        clear: () => {},
        removeItem: (key) => {},
      },
      writable: true,
    });

    // Polyfill TransformStream for environments that might need it (e.g., Playwright's Node.js runner)
    if (typeof this.global.TransformStream === 'undefined') {
      this.global.TransformStream = require('web-streams-polyfill').TransformStream;
    }
  }

  async teardown() {
    await super.teardown();
  }

  get = (property) => {
    if (property === 'localStorage') {
      return this.global.localStorage;
    }
    return super.get(property);
  };
}

module.exports = CustomTestEnvironment;
