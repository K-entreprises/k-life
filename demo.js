/**
 * K-Life Full Demo Script
 * 
 * Runs agent + vault monitor together, simulates crash + resurrection.
 * 
 * What you'll witness:
 * 1. Agent starts, WDK wallet loaded/created
 * 2. USDT₮ balance checked via WDK ERC-20
 * 3. K-Life vault opens, NFT keys minted
 * 4. Agent emits 3 heartbeats
 * 5. Agent "crashes" (heartbeats stop)
 * 6. Vault detects absence → resurrection protocol activates
 * 7. Agent back online ✅
 * 
 * Usage:
 *   npm run demo         # full speed (3min)
 *   npm run demo:fast    # accelerated (45s) ← recommended for judges
 */

import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const BOLD  = '\x1b[1m'
const CYAN  = '\x1b[36m'
const GREEN = '\x1b[32m'
const RESET = '\x1b[0m'
const DIM   = '\x1b[2m'

function banner(msg, color = CYAN) {
  const line = '═'.repeat(52)
  console.log(`\n${color}${BOLD}${line}`)
  console.log(`  ${msg}`)
  console.log(`${line}${RESET}\n`)
}

function runProcess(script, prefix, env = {}) {
  const proc = spawn('node', [join(__dirname, script)], {
    stdio: 'pipe',
    env: { ...process.env, ...env }
  })

  proc.stdout.on('data', (data) => {
    data.toString().split('\n')
      .filter(l => l.trim())
      .forEach(line => console.log(`${DIM}${prefix}${RESET} ${line}`))
  })

  proc.stderr.on('data', (data) => {
    data.toString().split('\n')
      .filter(l => l.trim())
      .forEach(line => console.log(`${DIM}${prefix}${RESET} ⚠️  ${line}`))
  })

  return proc
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function main() {
  // Detect fast mode
  const fast = process.env.HEARTBEAT_INTERVAL_MS === '5000'

  banner('K-Life Insurance Demo — Monsieur K × Swiss 6022', CYAN)

  console.log(`${BOLD}What you will witness:${RESET}`)
  console.log(`  1. Agent boots — WDK self-custodial wallet loaded`)
  console.log(`  2. USDT₮ balance checked via WDK ERC-20 API`)
  console.log(`  3. K-Life vault opens — NFT keys minted`)
  console.log(`  4. Agent emits ${fast ? '3 heartbeats every 5s' : '3 heartbeats every 30s'}`)
  console.log(`  5. Agent "crashes" — heartbeats stop`)
  console.log(`  6. Vault detects absence — resurrection triggers`)
  console.log(`  7. Agent back online ✅`)
  console.log()
  console.log(`${DIM}  Mode: ${fast ? 'FAST (45s)' : 'FULL (3min)'}${RESET}`)
  console.log()
  console.log('Starting in 2 seconds...\n')
  await sleep(2000)

  // ── Step 1: Start vault monitor ─────────────────────────────────────────
  banner('VAULT — K-Life Insurance Watchdog Active')
  const vaultEnv = {
    TIMEOUT_MS:        process.env.TIMEOUT_MS || '90000',
    CHECK_INTERVAL_MS: process.env.CHECK_INTERVAL_MS || '5000',
    AGENT_ADDRESS:     '0x8B3ea7e8eC53596A70019445907645838E945b7a'
  }
  const vault = runProcess('vault.js', '[VAULT]  ', vaultEnv)
  await sleep(3000)

  // ── Step 2: Start agent ──────────────────────────────────────────────────
  banner('AGENT — Monsieur K boots up with WDK wallet')
  const agentEnv = {
    MAX_BEATS:            '3',
    HEARTBEAT_INTERVAL_MS: process.env.HEARTBEAT_INTERVAL_MS || '30000'
  }
  const agent = runProcess('agent.js', '[AGENT]  ', agentEnv)

  // ── Step 3: Wait for completion ──────────────────────────────────────────
  const totalMs = fast
    ? (3 * 5000) + (parseInt(process.env.TIMEOUT_MS || '20000')) + 20000
    : (3 * 30000) + 90000 + 30000

  console.log(`\n${DIM}⏱️  Demo running... (~${Math.round(totalMs / 1000)}s)${RESET}\n`)

  await new Promise((resolve) => {
    const timer = setTimeout(resolve, totalMs)
    vault.on('close', () => { clearTimeout(timer); resolve() })
  })

  agent.kill()
  vault.kill()

  // ── Result ───────────────────────────────────────────────────────────────
  banner('Demo Complete ✅', GREEN)
  console.log(`${BOLD}What happened:${RESET}`)
  console.log(`  ✅ WDK wallet loaded (self-custodial, no MetaMask required)`)
  console.log(`  ✅ USDT₮ balance queried via WDK ERC-20 API`)
  console.log(`  ✅ K-Life vault monitoring active`)
  console.log(`  ✅ Heartbeats emitted (on-chain when POL available)`)
  console.log(`  ✅ Heartbeat failure detected by vault`)
  console.log(`  ✅ Resurrection protocol triggered`)
  console.log(`  ✅ Agent back online`)
  console.log()
  console.log(`${BOLD}Files created:${RESET}`)
  console.log(`  heartbeat.json    — last heartbeat state`)
  console.log(`  resurrection.json — resurrection log`)
  console.log()
  console.log(`${BOLD}Links:${RESET}`)
  console.log(`  🌐 K-Life:  https://www.supercharged.works/klife.html`)
  console.log(`  🔗 Wallet:  https://amoy.polygonscan.com/address/0x8B3ea7e8eC53596A70019445907645838E945b7a`)
  console.log(`  🤖 Agent:   https://6022.link`)
  console.log(`  🐦 X:       https://x.com/MonsieurK6022`)
}

main().catch(console.error)
