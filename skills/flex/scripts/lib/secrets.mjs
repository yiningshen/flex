// Patterns for things that must never appear in footage. Shared by record.mjs, record-cli.mjs and scan-secrets.mjs.
export const PATTERNS = [
  ['private key', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['AWS access key', /\b(AKIA|ASIA)[0-9A-Z]{16}\b/],
  ['OpenAI/Anthropic-style key', /\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{20,}\b/],
  ['GitHub token', /\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}\b|\bgithub_pat_[A-Za-z0-9_]{40,}\b/],
  ['Slack token', /\bxox[abposr]-[A-Za-z0-9-]{10,}\b/],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['Stripe live key', /\b(sk|rk|pk)_live_[0-9A-Za-z]{16,}\b/],
  ['JWT', /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/],
  ['secret assignment', /\b(api[_-]?key|secret|token|passw(or)?d|auth)\b\s*[:=]\s*["']?[^\s"'<>]{8,}/i],
  ['connection string with password', /\b[a-z+]+:\/\/[^\s:@/]+:[^\s@/]{3,}@/i],
  ['email address', /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/],
];

// Demo/placeholder values that are fine to show.
const SAFE = [/@(example|test|demo)\.(com|org|net)\b/i, /\bnoreply@/i, /\bsk-(x{4,}|\.{3}|your|demo|test)/i, /\b(your|my|demo|test|fake|placeholder|xxxx|\*{4,})/i];

export function findSecrets(text, { allowEmails = [] } = {}) {
  const hits = [];
  for (const [kind, re] of PATTERNS) {
    const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
    for (const m of text.matchAll(g)) {
      const s = m[0];
      if (SAFE.some(r => r.test(s))) continue;
      if (kind === 'email address' && allowEmails.some(e => s.toLowerCase().endsWith(e.toLowerCase()))) continue;
      hits.push({ kind, match: s.length > 12 ? s.slice(0, 6) + '…' + s.slice(-3) : s });
    }
  }
  return hits;
}
