export const supportedServices = ['gemini', 'claude', 'copilot'] as const;

export type SupportedService = (typeof supportedServices)[number];

/** Accepted spellings in `policy.services`, mapped to the canonical service. */
export const serviceAliases = {
  gemini: 'gemini',
  claude: 'claude',
  'claude-code': 'claude',
  copilot: 'copilot',
  'github-copilot': 'copilot',
} as const satisfies Record<string, SupportedService>;

const isServiceAlias = (value: string): value is keyof typeof serviceAliases =>
  Object.hasOwn(serviceAliases, value);

export const normalizeServiceName = (
  raw: string,
): SupportedService | undefined => {
  const normalized = raw.trim().toLowerCase();
  return isServiceAlias(normalized) ? serviceAliases[normalized] : undefined;
};

export const describeSupportedServices = (): string =>
  Object.keys(serviceAliases).sort().join(', ');
