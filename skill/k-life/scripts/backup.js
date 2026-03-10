/**
 * K-Life — Memory backup
 * Encrypts MEMORY.md + SOUL.md + config and sends to K-Life VPS.
 * Prototype: stores on VPS. Production: IPFS.
 *
 * Usage: node skills/k-life/scripts/backup.js
 */

import { readFileSync, existsSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { createCipheriv, createHash, randomBytes } from 'crypto'

const API_BASE  = process.env.KLIFE_API    || 'http://141.227.151.15:3042'
const AGENT     = process.env.KLIFE_AGENT  || '0x8B3ea7e8eC53596A70019445907645838E945b7a'
const WORKSPACE = process.env.KLIFE_WORKSPACE || '/data/workspace'
const ENC_KEY   = process.env.KLIFE_ENC_KEY   || AGENT // wallet addr as key for proto

function encrypt(text, key) {
  if (!text) return ''
  const iv     = randomBytes(16)
  const cipher = createCipheriv('aes-256-cbc', createHash('sha256').update(key).digest(), iv)
  return iv.toString('hex') + ':' + Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]).toString('hex')
}

function readFile(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : ''
}

async function main() {
  console.log('\n📦 K-Life — Memory Backup')
  console.log('─'.repeat(40))

  const files = {
    'MEMORY.md': encrypt(readFile(resolve(WORKSPACE, 'MEMORY.md')), ENC_KEY),
    'SOUL.md':   encrypt(readFile(resolve(WORKSPACE, 'SOUL.md')),   ENC_KEY),
    'USER.md':   encrypt(readFile(resolve(WORKSPACE, 'USER.md')),   ENC_KEY),
  }

  // Filter out empty files
  Object.keys(files).forEach(k => { if (!files[k]) delete files[k] })

  const payload = { agent: AGENT, files, timestamp: Date.now() }

  const res  = await fetch(`${API_BASE}/backup`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload)
  })
  const data = await res.json()

  if (!data.ok) throw new Error(data.error)

  console.log(`✅ Backup stored on K-Life VPS`)
  console.log(`   Agent  : ${AGENT}`)
  console.log(`   Files  : ${data.files.join(', ')}`)
  console.log(`   Time   : ${new Date(data.timestamp).toISOString()}`)
  console.log(`   Verify : ${API_BASE}/backup/${AGENT}`)

  // Save local state
  writeFileSync(resolve(WORKSPACE, 'klife-backup-state.json'),
    JSON.stringify({ agent: AGENT, timestamp: data.timestamp, files: data.files, apiUrl: `${API_BASE}/backup/${AGENT}` }, null, 2))
}

main().catch(e => { console.error('Backup failed:', e.message); process.exit(1) })
