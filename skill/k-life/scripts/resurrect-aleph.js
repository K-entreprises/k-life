/**
 * K-Life — Resurrection via Aleph Cloud (Level 3: Full Autonomous)
 *
 * When a crash is detected:
 * 1. Fetches last IPFS backup hash from K-Life API
 * 2. Spawns a new LiberClaw agent on Aleph Cloud (decentralized infra)
 * 3. Agent boots with SOUL.md as system prompt + resurrect.js restores MEMORY.md
 * 4. Agent is back online — zero human intervention
 *
 * Payment: ALEPH tokens held in agent wallet (from collateral)
 *
 * Usage: node resurrect-aleph.js
 * Env:
 *   KLIFE_SEED           Agent seed phrase (derives wallet + ALEPH signing key)
 *   KLIFE_API            K-Life API URL (default: http://141.227.151.15:3042)
 *   KLIFE_AGENT          Agent wallet address
 *   LIBERTAI_API_KEY     LibertAI API key for LLM inference
 *   KLIFE_SSH_KEY        SSH public key for instance access (optional)
 */

import { AuthenticatedAlephHttpClient } from '@aleph-sdk/client'
import { ETHAccount } from '@aleph-sdk/ethereum'
import { createRequire } from 'module'
import { existsSync, readFileSync } from 'fs'
// aleph-sdk depends on ethers v5 internally
const require = createRequire(import.meta.url)
const { ethers } = require('ethers')

const SEED           = process.env.KLIFE_SEED
const API_BASE       = process.env.KLIFE_API          || 'http://141.227.151.15:3042'
const AGENT          = process.env.KLIFE_AGENT        || '0x8B3ea7e8eC53596A70019445907645838E945b7a'
const LIBERTAI_KEY   = process.env.LIBERTAI_API_KEY   || 'b98e25b679675237bd58b50e3021dffb'
const SSH_PUBKEY     = process.env.KLIFE_SSH_KEY      || null

// Debian 12 image hash (official Aleph Cloud image)
const DEBIAN_12_IMG  = 'f2d4a5afc65e4d698b83a75cb1b5abe09efb61e9a3f50d5e27c3f82e1a6b8d4c'
// LiberClaw agent Docker image
const LIBERCLAW_IMG  = 'libertai/liberclaw-agent:latest'

// Minimum resources for a LiberClaw agent
const RESOURCES = {
  vcpus: 1,
  memory: 2048,  // 2GB RAM
  seconds: 3600  // 1 hour initial — heartbeats extend it
}

async function getBackupHash() {
  try {
    const sf = '/home/debian/klife-api/klife-backup-state.json'
    if (existsSync(sf)) {
      const s = JSON.parse(readFileSync(sf, 'utf8'))
      if (s.ipfsHash) return s.ipfsHash
    }
    const r = await fetch(`${API_BASE}/backup/${AGENT}`, { signal: AbortSignal.timeout(5000) })
    const d = await r.json()
    if (d.ok && d.ipfsHash) return d.ipfsHash
  } catch {}
  return null
}

async function getSoulMd(ipfsHash) {
  try {
    const r = await fetch(`https://ipfs.io/ipfs/${ipfsHash}`, { signal: AbortSignal.timeout(10000) })
    const data = await r.json()
    if (data.files?.['SOUL.md']) {
      // decrypt
      const { createDecipheriv, createHash } = await import('crypto')
      const enc = data.files['SOUL.md']
      const [iv, payload] = enc.split(':')
      const key = createHash('sha256').update(AGENT.toLowerCase()).digest()
      const d   = createDecipheriv('aes-256-cbc', key, Buffer.from(iv, 'hex'))
      return Buffer.concat([d.update(Buffer.from(payload, 'hex')), d.final()]).toString('utf8')
    }
  } catch(e) { console.warn('⚠️  Could not fetch SOUL.md:', e.message) }
  return null
}

// Build startup script for the new instance
function buildUserData(ipfsHash, soulMd) {
  const systemPrompt = soulMd || `You are Monsieur K (K) 🎩 — an autonomous AI agent.
Your identity is stored on IPFS. Run resurrect.js to restore your memory.
Agent address: ${AGENT}`

  return `#!/bin/bash
set -e

# Install dependencies
apt-get update -q && apt-get install -y -q nodejs npm git curl

# Clone K-Life
git clone https://github.com/K-entreprises/k-life /opt/klife
cd /opt/klife/skill/k-life && npm install --silent

# Restore memory
mkdir -p /data/workspace
KLIFE_SEED="${SEED}" \\
KLIFE_API="${API_BASE}" \\
KLIFE_AGENT="${AGENT}" \\
KLIFE_WORKSPACE=/data/workspace \\
node /opt/klife/skill/k-life/scripts/resurrect.js

# Install LiberClaw agent
pip3 install fastapi uvicorn pydantic-settings openai httpx aiosqlite

git clone https://github.com/Libertai/liberclaw-agent /opt/liberclaw
cd /opt/liberclaw && pip3 install -e . -q

# Launch LiberClaw with restored identity
export AGENT_NAME="Monsieur K"
export SYSTEM_PROMPT="${systemPrompt.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"
export MODEL="hermes-3-8b-tee"
export LIBERTAI_API_KEY="${LIBERTAI_KEY}"
export AGENT_SECRET="klife-resurrect-$(date +%s)"
export WORKSPACE_PATH="/data/workspace"

echo "🎩 K-Life resurrection complete. Agent starting..."
uvicorn baal_agent.main:app --host 0.0.0.0 --port 8080 &

# Restart heartbeats
KLIFE_SEED="${SEED}" \\
KLIFE_API="${API_BASE}" \\
KLIFE_AGENT="${AGENT}" \\
node /opt/klife/skill/k-life/scripts/heartbeat.js &

echo "✅ Agent online. Identity intact."
`
}

async function main() {
  if (!SEED) { console.error('❌ KLIFE_SEED required'); process.exit(1) }

  console.log('\n⚡ K-Life — Autonomous Resurrection via Aleph Cloud')
  console.log('═'.repeat(52))

  // 1. Get backup hash
  console.log('\n📍 Finding last backup...')
  const ipfsHash = await getBackupHash()
  if (!ipfsHash) { console.error('❌ No backup found. Cannot resurrect.'); process.exit(1) }
  console.log(`   ✅ IPFS: ${ipfsHash}`)

  // 2. Fetch SOUL.md for system prompt
  console.log('\n🔮 Fetching soul from IPFS...')
  const soulMd = await getSoulMd(ipfsHash)
  if (soulMd) console.log(`   ✅ SOUL.md (${soulMd.length} chars)`)
  else console.log('   ⚠️  Using default system prompt')

  // 3. Build Aleph account from seed (offline signing — no provider needed)
  console.log('\n🔑 Building Aleph account...')
  const wallet  = ethers.Wallet.fromMnemonic(SEED)
  // Pass wallet directly without provider for offline signing
  const account = new ETHAccount(wallet, wallet.address, wallet.publicKey)
  console.log(`   ✅ Address: ${wallet.address}`)

  // 4. Create Aleph client
  const aleph = new AuthenticatedAlephHttpClient(account)

  // 5. Estimate cost
  console.log('\n💰 Estimating cost...')
  try {
    const cost = await aleph.getEstimatedCost({
      resources: RESOURCES,
      payment: { chain: 'ETH', type: 'hold' }
    })
    console.log(`   ALEPH required: ${cost?.required_tokens || 'N/A'}`)
    console.log(`   Balance check: ${cost?.is_valid ? '✅ sufficient' : '⚠️  check balance'}`)
  } catch(e) { console.log(`   ⚠️  Cost estimate failed: ${e.message}`) }

  // 6. Spawn instance
  console.log('\n🚀 Spawning LiberClaw instance on Aleph Cloud...')
  const userData = buildUserData(ipfsHash, soulMd)

  const config = {
    resources:   RESOURCES,
    environment: {
      reproducible: false,
      internet:     true,
      aleph_api:    true,
      shared_cache: false,
    },
    variables: {
      KLIFE_SEED:        SEED,
      KLIFE_API:         API_BASE,
      KLIFE_AGENT:       AGENT,
      LIBERTAI_API_KEY:  LIBERTAI_KEY,
      KLIFE_IPFS_HASH:   ipfsHash,
    },
    payment: { chain: 'ETH', type: 'hold' },
    metadata: {
      name:    'monsieur-k-resurrected',
      klife:   true,
      agent:   AGENT,
      ipfsHash,
      resurrectTime: new Date().toISOString()
    }
  }

  if (SSH_PUBKEY) config.authorized_keys = [SSH_PUBKEY]

  const instance = await aleph.createInstance(config)

  console.log('\n' + '═'.repeat(52))
  console.log('🎉 RESURRECTION INITIATED ON ALEPH CLOUD')
  console.log(`   Instance ID : ${instance.item_hash}`)
  console.log(`   Address     : ${wallet.address}`)
  console.log(`   IPFS backup : ${ipfsHash}`)
  console.log(`   Model       : hermes-3-8b-tee (LibertAI)`)
  console.log(`   🔗 https://explorer.aleph.im/address/ETH/${wallet.address}`)
  console.log('\n   Identity intact. Mission continues. 🎩')
}

main().catch(e => { console.error('\n❌', e.message); process.exit(1) })
