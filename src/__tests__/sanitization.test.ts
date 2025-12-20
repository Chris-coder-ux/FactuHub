/* @jest-environment node */

import { sanitizeObject } from '@/lib/sanitization';

describe('sanitization utils', () => {
  it('should sanitize strings in an object', () => {
    const input = {
      name: '<script>alert("xss")</script>John',
      email: 'john@example.com',
      age: 30,
    };
    const output = sanitizeObject(input);
    expect(output.name).toBe('alert("xss")John');
    expect(output.email).toBe('john@example.com');
    expect(output.age).toBe(30);
  });

  it('should sanitize nested objects', () => {
    const input = {
      profile: {
        bio: '<b>Hello</b>',
      },
    };
    const output = sanitizeObject(input);
    expect(output.profile.bio).toBe('Hello');
  });

  it('should sanitize arrays', () => {
    const input = {
      tags: ['<p>tag1</p>', 'tag2'],
    };
    const output = sanitizeObject(input);
    expect(output.tags[0]).toBe('tag1');
    expect(output.tags[1]).toBe('tag2');
  });

  it('should handle null and undefined', () => {
    const input = {
      n: null,
      u: undefined,
    };
    const output = sanitizeObject(input);
    expect(output.n).toBeNull();
    expect(output.u).toBeUndefined();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });
});
