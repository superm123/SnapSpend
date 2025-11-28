import 'web-streams-polyfill';

async function globalSetup() {
  // Polyfill TransformStream for Playwright's Node.js environment
  if (typeof globalThis.TransformStream === 'undefined') {
    // @ts-ignore
    globalThis.TransformStream = require('web-streams-polyfill').TransformStream;
  }
}

export default globalSetup;
