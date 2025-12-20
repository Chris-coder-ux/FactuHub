/* eslint-env jest, node */
/* eslint-disable no-undef */
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Polyfills for Next.js 13+ environment in Jest
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

if (typeof global.Request === 'undefined') {
  global.Request = class Request {
      constructor(input, init) {
        this.url = input;
        this.headers = new Headers(init?.headers);
      }
  };
}
if (typeof global.Response === 'undefined') {
  // Simple Response mock
  global.Response = class Response {
      constructor(body, init) {
        this.body = body;
        this.init = init;
        this.headers = new Headers(init?.headers);
        this.status = init?.status || 200;
        this.statusText = init?.statusText || '';
      }
      async json() {
        return typeof this.body === 'string' ? JSON.parse(this.body) : this.body;
      }
      async text() {
        return typeof this.body === 'string' ? this.body : JSON.stringify(this.body);
      }
      static json(data, init) {
        return new Response(JSON.stringify(data), {
            ...init,
            headers: {
                'content-type': 'application/json',
                ...(init?.headers || {})
            }
        });
      }
  };
} else {
    // If Response exists (e.g. from jsdom) but misses static json (common in some jsdom versions for now)
    if (!global.Response.json) {
        global.Response.json = function(data, init) {
            const body = JSON.stringify(data);
            const headers = new Headers(init?.headers);
            headers.set('Content-Type', 'application/json');
            return new Response(body, { ...init, headers });
        }
    }
}

// Unconditionally mock fetch
globalThis.fetch = jest.fn();

// Mock SWR globally
jest.mock('swr', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    data: null,
    error: null,
    isLoading: true,
    mutate: jest.fn(),
  })),
  mutate: jest.fn(),
  mutateAsync: jest.fn(),
}));

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: { user: { name: 'Test User', email: 'test@example.com' } },
    status: 'authenticated',
  })),
  signIn: jest.fn(),
  signOut: jest.fn(),
  SessionProvider: ({ children }) => children,
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
}));