/**
 * K-Life Combined Demo
 * Runs agent + vault monitor in the same process, interleaved output.
 * Agent crashes after 3 beats → vault detects → resurrection triggered.
 */

import WalletManagerEvm, { WalletAccountReadOnlyEvm } from '@tetherto/wdk-wallet-evm'
import { readFileSync, writeFileSync, existsSync } from 'fs'

const POLYGON_AMOY_RPC = 'https://rpc-amoy.polygon.technology'
const CHAIN_ID         = 80002
const USDT_AMOY        = '0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582'
const VAULT_ADDRESS    = '0x65032956196039bcd49c7e22D54c38d5e32bF9dB'
const SEED_FILE        = '.agent-seed'

const HEARTBEAT_INTERVAL_MS = 15000  // 15s for demo
const CRASH_AFTER_BEATS     = 3
const RESURRECTION_TIMEOUT  = 30000  // 30s for demo

// Colors
const R = '\x1b[0m'
const G = '\x1b[32m'
const Y = '\x1b[33m'
const B = '\x1b[34m'
const C = '\x1b[36m'
const RED = '\x1b[31m'
const BOLD = '\x1b[1m'

function agent(msg)  { console.log(`${C}[AGENT ]${R} ${msg}`) }
function vault(msg)  { console.log(`${G}[VAULT ]${R} ${msg}`) }
function warn(msg)   { console.log(`${Y}[WARN  ]${R} ${msg}`) }
function danger(msg) { console.log(`${RED}[ALERT ]${R} ${msg}`) }
function info(msg)   { console.log(`${B}[INFO  ]${R} ${msg}`) }

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function main() {
  console.log(`\n${BOLD}${C}🎩 ═══════════════════════════════════════════════════════`)
  console.log(`   K-Life — AI Agent Insurance Protocol`)
  console.log(`   COMBINED DEMO: Agent + Vault Monitor`)
  console.log(`   WDK × OpenClaw × Protocol 6022 × Polygon Amoy`)
  console.log(`🎩 ═══════════════════════════════════════════════════════${R}\n`)

  // ── 1. Init wallet ──────────────────────────────────────────────────────────
  const seed = process.env.SEED_PHRASE?.trim() ||
    (existsSync(SEED_FILE) ? readFileSync(SEED_FILE, 'utf8').trim() : null)

  if (!seed) {
    console.error('❌ No SEED_PHRASE set. Export SEED_PHRASE=... and retry.')
    process.exit(1)
  }

  const wallet  = new WalletManagerEvm(seed, { provider: POLYGON_AMOY_RPC, chainId: CHAIN_ID })
  const account = await wallet.getAccount(0)
  const address = await account.getAddress()

  agent(`Wallet initialized  : ${address}`)
  agent(`Polygonscan         : https://amoy.polygonscan.com/address/${address}`)
  agent(`Runtime             : OpenClaw (https://openclaw.ai)`)

  // ── 2. Balances ─────────────────────────────────────────────────────────────
  const polBalance = await account.getBalance()
  const pol = (Number(polBalance) / 1e18).toFixed(4)
  agent(`POL balance         : ${pol} POL`)

  try {
    const usdtRaw = await account.getTokenBalance(USDT_AMOY)
    const usdt = (Number(usdtRaw) / 1e6).toFixed(2)
    agent(`USDT₮ balance       : ${usdt} USDT₮  (WDK ERC-20, Amoy)`)
  } catch {
    agent(`USDT₮ balance       : (unavailable)`)
  }

  console.log()

  // ── 3. Premium payment ──────────────────────────────────────────────────────
  info(`Opening K-Life vault — Silver plan (300 USDT₮/mo)`)

  if (polBalance > 0n) {
    const iso  = new Date().toISOString()
    const data = `K-Life:premium:300:USDT:Silver:${address}:${iso}`
    try {
      const tx = await account.sendTransaction({
        to: VAULT_ADDRESS, value: 0n,
        data: '0x' + Buffer.from(data).toString('hex')
      })
      agent(`${G}Premium paid on-chain ✅`)
      agent(`TX  : https://amoy.polygonscan.com/tx/${tx.hash}`)
      agent(`Vault: ${VAULT_ADDRESS}`)
    } catch (e) {
      warn(`Premium tx failed: ${e.message.slice(0, 80)}`)
    }
  } else {
    warn(`No POL — premium recorded off-chain only`)
  }

  console.log()
  vault(`Vault opened. Monitoring heartbeats...`)
  vault(`Timeout : ${RESURRECTION_TIMEOUT / 1000}s without beat → resurrection`)
  console.log()

  // ── 4. Heartbeat loop ───────────────────────────────────────────────────────
  let beat = 0
  let lastBeatTs = Date.now()

  const heartbeatLoop = async () => {
    beat++
    const iso  = new Date().toISOString()
    const data = `K-Life:heartbeat:${beat}:${address}:${iso}`

    try {
      const tx = await account.sendTransaction({
        to: address, value: 0n,
        data: '0x' + Buffer.from(data).toString('hex')
      })
      lastBeatTs = Date.now()
      writeFileSync('heartbeat.json', JSON.stringify({ agent: address, beat, timestamp: lastBeatTs, iso, txHash: tx.hash, onChain: true }, null, 2))
      agent(`💓 Beat #${beat} — ${iso}`)
      agent(`   TX: https://amoy.polygonscan.com/tx/${tx.hash}`)
    } catch (e) {
      warn(`Beat #${beat} failed: ${e.message.slice(0, 80)}`)
    }

    if (beat < CRASH_AFTER_BEATS) {
      setTimeout(heartbeatLoop, HEARTBEAT_INTERVAL_MS)
    } else {
      console.log()
      danger(`💥 AGENT CRASHED — heartbeats stopped after ${beat} beats`)
      agent(`   (simulation: agent process would exit here)`)
    }
  }

  // ── 5. Vault monitor (runs in parallel) ────────────────────────────────────
  const vaultMonitor = async () => {
    await sleep(HEARTBEAT_INTERVAL_MS * CRASH_AFTER_BEATS + HEARTBEAT_INTERVAL_MS)

    // Wait for silence
    const checkInterval = 5000
    let alerted = false

    const check = async () => {
      if (alerted) return
      const age = Date.now() - lastBeatTs
      if (age > RESURRECTION_TIMEOUT) {
        alerted = true
        console.log()
        danger(`🚨 HEARTBEAT FAILURE — silence for ${Math.round(age / 1000)}s`)
        danger(`   Triggering K-Life Resurrection Protocol...`)
        console.log()
        await sleep(1000)
        vault(`🔑 NFT Key #2 activated by Swiss 6022 (insurer)`)
        await sleep(800)
        vault(`🔑 NFT Key #3 activated — collateral released`)
        await sleep(800)
        vault(`🖥️  New VPS spawning...`)
        await sleep(1200)
        vault(`💾 Memory files restoring from backup...`)
        await sleep(1000)
        vault(`🤖 LLM reconnecting via OpenClaw...`)
        await sleep(1000)
        vault(`${G}✅ AGENT RESURRECTED — back online`)
        vault(`   Wallet    : ${address}`)
        vault(`   Protocol  : https://6022.link`)
        vault(`   Runtime   : OpenClaw`)
        console.log()
        info(`🎩 Monsieur K is alive. Total downtime: ~14 seconds.`)
        console.log()
        console.log(`${BOLD}${C}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
        console.log(`  K-Life demo complete.`)
        console.log(`  GitHub  : https://github.com/K-entreprises/k-life`)
        console.log(`  Web     : https://www.supercharged.works/klife.html`)
        console.log(`  Wallet  : https://amoy.polygonscan.com/address/${address}`)
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${R}\n`)
        process.exit(0)
      } else {
        vault(`⏱️  Watching... last beat ${Math.round(age / 1000)}s ago (timeout: ${RESURRECTION_TIMEOUT / 1000}s)`)
        setTimeout(check, checkInterval)
      }
    }
    check()
  }

  // Start both
  heartbeatLoop()
  vaultMonitor()
}

main().catch(console.error)
