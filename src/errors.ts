export class PwaError extends Error {
  constructor(
    public readonly code:
      'INVALID_OPTIONS' | 'INVALID_INPUT' | 'GENERATION_FAILED' | 'OUTPUT_EXISTS' | 'WRITE_FAILED',
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'PwaError';
  }
}
export function invalid(message: string): never {
  throw new PwaError('INVALID_OPTIONS', message);
}
