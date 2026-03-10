/**
 * K-Life — Resurrection
 * Run at agent startup. Fetches latest memory backup from K-Life VPS
 * and restores files if local memory is empty or missing.
 *
 * Usage: node skills/k-life/scripts/resurrect.js
 */

import { writeFileSync, existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import { createDecipheriv, createHash } from 'crypto'

const API_BASE  = process.env.KLIFE_API       || 'http://141.227.151.15:3042'
const AGENT     = process.env.KLIFE_AGENT     || '0x8B3ea7e8eC53596A70019445907645838E945b7a'
const WORKSPACE = process.env.KLIFE_WORKSPACE || '/data/workspace'
const ENC_KEY   = process.env.KLIFE_ENC_KEY   || AGENT

function decrypt(encrypted, key) {
  if (!encrypted) return ''
  try {
    const [ivHex, dataHex] = encrypted.split(':')
    const decipher = createDecipheriv(
      'aes-256-cbc',
      createHash('sha256').update(key).digest(),
      Buffer.from(ivHex, 'hex')
    )
    return Buffer.concat([
      decipher.update(Buffer.from(dataHex, 'hex')),
      decipher.final()
    ]).toString('utf8')
  } catch { return null }
}

function memoryIsEmpty() {
  const memPath = resolve(WORKSPACE, 'MEMORY.md')
  if (!existsSync(memPath)) return true
  const content = readFileSync(memPath, 'utf8').trim()
  return content.length < 50
}

async function main() {
  console.log('\n🔮 K-Life — Resurrection Check')
  console.log('─'.repeat(40))

  if (!memoryIsEmpty()) {
    console.log('✅ Memory intact — no resurrection needed')
    process.exit(0)
  }

  console.log('⚠️  Memory appears empty or missing — checking backup…')

  let backup
  try {
    const res = await fetch(`${API_BASE}/backup/${AGENT}`)
    if (!res.ok) {
      console.log('ℹ️  No backup found on K-Life VPS — first boot')
      process.exit(0)
    }
    backup = await res.json()
  } catch(e) {
    console.error(`❌ Could not reach K-Life API: ${e.message}`)
    process.exit(1)
  }

  if (!backup.ok || !backup.files) {
    console.log('ℹ️  No backup data — starting fresh')
    process.exit(0)
  }

  console.log(`📡 Backup found — ${backup.iso}`)
  console.log(`   Files: ${Object.keys(backup.files).join(', ')}`)
  console.log('')

  let restored = 0
  for (const [filename, encrypted] of Object.entries(backup.files)) {
    const content = decrypt(encrypted, ENC_KEY)
    if (!content) {
      console.warn(`⚠️  Could not decrypt ${filename}`)
      continue
    }
    const filepath = resolve(WORKSPACE, filename)
    writeFileSync(filepath, content)
    console.log(`✅ Restored: ${filename} (${content.length} chars)`)
    restored++
  }

  if (restored > 0) {
    console.log(`\n🎉 RESURRECTED — ${restored} file(s) restored`)
    console.log(`   Identity intact. Memory loaded. Mission continues. 🎩\n`)
  } else {
    console.log('\n⚠️  Backup found but nothing could be restored')
    process.exit(1)
  }
}

main().catch(e => { console.error('Resurrection failed:', e.message); process.exit(1) })
