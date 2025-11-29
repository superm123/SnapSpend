import 'web-streams-polyfill';

import { TransformStream } from 'web-streams-polyfill';

async function globalSetup() {
  // Polyfill TransformStream for Playwright's Node.js environment
  if (typeof globalThis.TransformStream === 'undefined') {
    // @ts-ignore
    globalThis.TransformStream = TransformStream;
  }
}

export default globalSetup;
