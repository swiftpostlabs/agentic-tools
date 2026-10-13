/** An expected failure: the CLI prints its message and exits 1, without a stack trace. */
export class ToolError extends Error {
  override name = 'ToolError';
}
