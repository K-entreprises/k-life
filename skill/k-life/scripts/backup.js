/**
 * K-Life — Memory backup
 * Reads local files, sends to K-Life API which handles:
 * - Encryption (AES-256 with agent address as key)
 * - IPFS pinning (local kubo node)
 * - On-chain hash storage (TX calldata)
 * - Shamir share2 storage in K-Life vault
 *
 * Usage: node skills/k-life/scripts/backup.js
 */

import { readFileSync, existsSync, writeFileSync } from 'fs'
import { resolve } from 'path'

const API_BASE  = process.env.KLIFE_API       || 'http://141.227.151.15:3042'
const AGENT     = process.env.KLIFE_AGENT     || '0x8B3ea7e8eC53596A70019445907645838E945b7a'
const WORKSPACE = process.env.KLIFE_WORKSPACE || '/data/workspace'

function readFile(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : null
}

async function main() {
  console.log('\n📦 K-Life — Memory Backup')
  console.log('─'.repeat(40))

  // Collect files
  const files = {}
  for (const filename of ['MEMORY.md', 'SOUL.md', 'USER.md']) {
    const content = readFile(resolve(WORKSPACE, filename))
    if (content && content.trim().length > 10) {
      files[filename] = content
      console.log(`   📄 ${filename} (${content.length} chars)`)
    }
  }

  if (Object.keys(files).length === 0) {
    console.log('⚠️  No files to backup')
    process.exit(0)
  }

  console.log('\n📡 Sending to K-Life API (IPFS + on-chain)…')

  const res  = await fetch(`${API_BASE}/backup/full`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ agent: AGENT, files })
  })
  const data = await res.json()

  if (!data.ok) throw new Error(data.error)

  console.log(`\n✅ BACKUP COMPLETE`)
  console.log(`   IPFS  : ${data.ipfsHash}`)
  console.log(`   TX    : ${data.txHash}`)
  console.log(`   Files : ${data.files.join(', ')}`)
  console.log(`   🔗 https://ipfs.io/ipfs/${data.ipfsHash}`)
  console.log(`   🔗 ${data.explorer}`)

  // Save local state
  writeFileSync(resolve(WORKSPACE, 'klife-backup-state.json'),
    JSON.stringify({ agent: AGENT, ipfsHash: data.ipfsHash, txHash: data.txHash, timestamp: Date.now(), files: data.files }, null, 2))
}

main().catch(e => { console.error('❌ Backup failed:', e.message); process.exit(1) })
