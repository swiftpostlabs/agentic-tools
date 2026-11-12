import path from 'node:path';
import { describe, expect, test } from '@jest/globals';
import { formatRelative } from './paths.ts';

describe('formatRelative', () => {
  const root = path.resolve('/repo');

  test('renders a path inside the root relative, with forward slashes', () => {
    expect(formatRelative(path.join(root, 'a', 'b'), root)).toBe('a/b');
  });

  test('keeps a child whose name starts with two dots inside the root', () => {
    expect(formatRelative(path.join(root, '..foo'), root)).toBe('..foo');
  });

  test('renders a path outside the root absolute', () => {
    const outside = path.resolve('/elsewhere');
    expect(formatRelative(outside, root)).toBe(outside);
    expect(formatRelative(path.dirname(root), root)).toBe(path.dirname(root));
  });
});
