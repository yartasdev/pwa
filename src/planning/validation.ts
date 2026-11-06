import sharp from 'sharp';
import { invalid } from '../errors.js';

export function object(
  value: unknown,
  label: string,
  keys?: string[],
): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Buffer.isBuffer(value)) {
    invalid(`${label} must be an object.`);
  }

  if (keys) {
    for (const key of Object.keys(value)) {
      if (!keys.includes(key)) {
        invalid(`Unknown ${label} option: ${key}`);
      }
    }
  }
}

export function integer(value: unknown, name: string, max = 8192): asserts value is number {
  if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > max) {
    invalid(`${name} must be an integer between 1 and ${max}.`);
  }
}

export function fraction(
  value: unknown,
  name: string,
  min: number,
  max: number,
): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    invalid(`${name} must be between ${min} and ${max}.`);
  }
}

export function boolean(value: unknown, label: string): void {
  if (value !== undefined && typeof value !== 'boolean') {
    invalid(`${label} must be boolean.`);
  }
}

export function color(value: unknown, name: string): asserts value is string {
  if (typeof value !== 'string' || !value) {
    invalid(`${name} must be a CSS color.`);
  }

  try {
    // Sharp validates CSS color syntax synchronously without allocating output pixels.
    const pipeline = sharp({ create: { width: 1, height: 1, channels: 4, background: value } });
    pipeline.destroy();
  } catch {
    invalid(`${name} must be a valid CSS color.`);
  }
}

export function sizes(value: unknown, fallback: number[], name: string): number[] {
  const list = value === undefined ? fallback : value;

  if (!Array.isArray(list) || list.length === 0 || list.length > 64) {
    invalid(`${name} must contain 1–64 sizes.`);
  }

  for (const size of list) {
    integer(size, name);
  }

  return [...new Set(list as number[])].sort((a, b) => a - b);
}
