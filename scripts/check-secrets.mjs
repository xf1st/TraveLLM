import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

// Never print matched text, tokens, URLs, or environment values.
const git = args => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
const staged = process.argv.includes('--staged')
const known = []
try {
  for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*(\w+)\s*=\s*(.*)/)
    if (!match || match[1].startsWith('NEXT_PUBLIC_') || !/(SECRET|TOKEN|PASSWORD|KEY|PROXY|ADMIN.*EMAIL|EMAIL.*ADMIN)/i.test(match[1])) continue
    const value = match[2].trim().replace(/^['"]|['"]$/g, '')
    if (value.length < 8 || /^(?:your[_-]|replace[_-]|change[_-]|<)/i.test(value)) continue
    known.push({ type: 'configured-secret', value })
    try { const password = decodeURIComponent(new URL(value).password); if (password.length >= 5) known.push({ type: 'proxy-password', value: password }) } catch {}
  }
} catch {}

const candidates = staged
  ? git(['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z'])
  : git(['ls-files', '-z'])
const findings = []
for (const path of candidates.split('\0').filter(Boolean)) {
  if (/(?:^|\/)\.env(?:$|\.(?!example$))/.test(path)) {
    findings.push({ path, line: 1, type: 'private-environment-file' })
    continue
  }
  if (/\.(?:png|jpe?g|webp|gif|woff2?|mp4|pdf|zip|ico|glb|ttf)$/i.test(path)) continue
  let content
  try { content = staged ? git(['show', `:${path}`]) : readFileSync(path, 'utf8') } catch { continue }
  if (content.includes('\0')) continue
  for (const [index, line] of content.split(/\r?\n/).entries()) {
    const types = new Set()
    for (const secret of known) if (line.includes(secret.value)) types.add(secret.type)
    if (/\b(?:sk-or-v1-[\w-]{40,}|sk-proj-[\w-]{40,}|sk-[a-f0-9]{32,64}|gh[pousr]_[\w]{30,}|github_pat_[\w]{30,}|sb_secret_[\w-]{20,}|gsk_[\w]{30,}|hf_[\w]{25,})\b/.test(line)) types.add('private-api-token')
    if (/\b\d{7,14}:[a-zA-Z0-9_-]{30,}\b/.test(line)) types.add('telegram-token')
    if (/-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/.test(line)) types.add('private-key')
    for (const match of line.matchAll(/https?:\/\/[^\s"'`<>\/]+:[^\s"'`<>@]+@[^\s"'`<>]+/g)) {
      if (/^https?:\/\/(?:username|user):(?:password|pass)@(?:host|proxy-host):port\b/i.test(match[0])) continue
      try {
        const url = new URL(match[0])
        const exampleHost = /(?:^|\.)(?:example|test|invalid)$/.test(url.hostname) || url.hostname === 'example.com'
        const exampleCredentials = ['username', 'user'].includes(url.username) && ['password', 'pass'].includes(url.password)
        if (!exampleHost && !exampleCredentials) types.add('credentialed-url')
      } catch { types.add('credentialed-url') }
    }
    for (const match of line.matchAll(/\beyJ[\w-]+\.[\w-]+\.[\w-]+\b/g)) {
      try { if (JSON.parse(Buffer.from(match[0].split('.')[1], 'base64url').toString()).role === 'service_role') types.add('supabase-service-role') } catch {}
    }
    for (const type of types) findings.push({ path, line: index + 1, type })
  }
}
if (findings.length) {
  console.error('Blocked: potential secrets found. Values are intentionally hidden.')
  for (const finding of findings) console.error(`${finding.path}:${finding.line} [${finding.type}]`)
  process.exitCode = 1
} else console.log(`Secret check passed (${staged ? 'staged files' : 'tracked working files'}; text patterns, not a security guarantee).`)
