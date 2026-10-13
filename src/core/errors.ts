/** An expected failure: the CLI prints its message and exits 1, without a stack trace. */
export class ToolError extends Error {
  override name = 'ToolError';
}

/** A malformed invocation (unknown option, missing argument): the CLI prints usage and exits 2. */
export class UsageError extends ToolError {
  override name = 'UsageError';
}
