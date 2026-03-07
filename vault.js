/**
 * K-Life Vault — Protocol 6022 Collateral Simulation
 * 
 * In production: this would be a Solidity smart contract on Polygon.
 * For the hackathon demo: a Node.js simulation of the vault mechanics.
 * 
 * The vault:
 * - Locks USDT collateral from the agent (via WDK sendTransaction)
 * - Mints 3 NFT keys: agent (#1), insurer (#2 + #3)
 * - Monitors heartbeat via agent.js / heartbeat.json
 * - On heartbeat failure: insurer uses keys #2+#3 to trigger resurrection
 */

import WalletManagerEvm, { WalletAccountReadOnlyEvm } from '@tetherto/wdk-wallet-evm'
import { readFileSync, existsSync } from 'fs'

// ── Config ────────────────────────────────────────────────────────────────────

const POLYGON_AMOY_RPC = 'https://rpc-amoy.polygon.technology'
const USDT_AMOY        = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F'

// ── Vault State (in-memory simulation) ───────────────────────────────────────

let vaultState = {
  status:    'empty',   // empty | active | triggered
  agentAddr: null,
  premium:   300,       // USD₮ / month
  collateral:300,       // USD₮ locked
  plan:      'Silver',
  keys: {
    '#1': { holder: 'agent',   purpose: 'proof of insurance' },
    '#2': { holder: 'insurer', purpose: 'resurrection trigger' },
    '#3': { holder: 'insurer', purpose: 'collateral release' }
  },
  lockedAt:  null,
  txHash:    null
}

// ── Colors ────────────────────────────────────────────────────────────────────
const GREEN  = '\x1b[32m'
const YELLOW = '\x1b[33m'
const BLUE   = '\x1b[34m'
const CYAN   = '\x1b[36m'
const RESET  = '\x1b[0m'
const BOLD   = '\x1b[1m'

function log(icon, color, msg) {
  console.log(`${color}${icon}${RESET} ${msg}`)
}

// ── Vault Actions ─────────────────────────────────────────────────────────────

async function showVaultStatus(agentAddress) {
  console.log(`\n${CYAN}${BOLD}🏛️  K-Life Vault — Protocol 6022${RESET}`)
  console.log(`${'─'.repeat(48)}`)

  // Use WDK read-only account to check USDT balance
  const readOnly = new WalletAccountReadOnlyEvm(agentAddress, {
    provider: POLYGON_AMOY_RPC
  })

  try {
    const usdtBal = await readOnly.getTokenBalance(USDT_AMOY)
    const usdt    = (Number(usdtBal) / 1e6).toFixed(2)
    log('💵', BLUE, `Agent USDT balance : ${usdt} USD₮  (WDK read-only)`)
  } catch (e) {
    log('💵', YELLOW, `Agent USDT balance : (check ${agentAddress})`)
  }

  try {
    const polBal = await readOnly.getBalance()
    const pol    = (Number(polBal) / 1e18).toFixed(4)
    log('💰', BLUE, `Agent POL balance  : ${pol} POL`)
  } catch (e) {
    log('💰', YELLOW, `Agent POL balance  : unavailable`)
  }

  console.log()
  log('🛡️ ', CYAN, `Vault status       : ${vaultState.status.toUpperCase()}`)
  log('💎', GREEN, `Plan               : ${vaultState.plan}`)
  log('🔒', GREEN, `Premium            : ${vaultState.premium} USD₮ / month`)
  log('🏦', GREEN, `Collateral locked  : ${vaultState.collateral} USD₮`)
  console.log()
  log('🗝️ ', BLUE,  `Key #1 → Agent   : proof of insurance (held by agent)`)
  log('🗝️ ', BLUE,  `Key #2 → Insurer : resurrection trigger`)
  log('🗝️ ', BLUE,  `Key #3 → Insurer : collateral release`)
  console.log()
}

async function openVault(agentAddress) {
  console.log(`\n${GREEN}${BOLD}🔓 Opening K-Life vault...${RESET}`)

  vaultState.status    = 'active'
  vaultState.agentAddr = agentAddress
  vaultState.lockedAt  = new Date().toISOString()

  // Simulate premium payment receipt
  log('✅', GREEN, `Vault opened for : ${agentAddress}`)
  log('✅', GREEN, `Premium locked   : ${vaultState.premium} USD₮  (testnet simulation)`)
  log('✅', GREEN, `NFT key #1 minted and delivered to agent`)
  log('✅', GREEN, `NFT keys #2+#3 minted and held by insurer (Swiss 6022)`)
  log('✅', GREEN, `Heartbeat monitoring: ACTIVE`)
  console.log(`\n   ${BLUE}This is what happens when a real agent calls:${RESET}`)
  console.log(`   vault.lockPremium(agentAddress, premiumUSDT)`)
  console.log(`   → USDT transferred via WDK sendTransaction`)
  console.log(`   → 3 NFT keys minted on Protocol 6022 contracts`)
  console.log(`   → Watchdog starts monitoring heartbeat.json / on-chain txs\n`)
}

async function checkLastHeartbeat() {
  if (!existsSync('heartbeat.json')) {
    return { status: 'waiting', beat: null, age: null }
  }

  const data = JSON.parse(readFileSync('heartbeat.json', 'utf8'))
  const age  = Date.now() - data.timestamp
  return { status: 'ok', beat: data.beat, age, iso: data.iso, txHash: data.txHash, onChain: data.onChain }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${CYAN}${BOLD}🏛️  ═══════════════════════════════════════════════`)
  console.log(`   K-Life Vault — Collateral & Resurrection Protocol`)
  console.log(`   Swiss 6022 × WDK × Protocol 6022`)
  console.log(`🏛️  ═══════════════════════════════════════════════${RESET}\n`)

  // Read agent address from heartbeat.json or use env
  let agentAddress = process.env.AGENT_ADDRESS

  if (!agentAddress && existsSync('heartbeat.json')) {
    const hb = JSON.parse(readFileSync('heartbeat.json', 'utf8'))
    agentAddress = hb.agent
    console.log(`📡 Loaded agent address from heartbeat.json`)
  }

  if (!agentAddress) {
    agentAddress = '0x8B3ea7e8eC53596A70019445907645838E945b7a' // Monsieur K default
    console.log(`📡 Using default agent address (Monsieur K)`)
  }

  console.log(`📍 Monitoring agent: ${agentAddress}`)

  // Show vault status
  await showVaultStatus(agentAddress)

  // Open vault
  await openVault(agentAddress)

  // Monitor heartbeat
  console.log(`${BLUE}${BOLD}👁️  Watching for heartbeats...${RESET}\n`)
  const TIMEOUT_MS = parseInt(process.env.TIMEOUT_MS || '90000')
  let   lastBeat   = null
  let   alerted    = false

  const monitor = async () => {
    const hb = await checkLastHeartbeat()

    if (hb.status === 'waiting') {
      log('⏳', YELLOW, 'Waiting for first heartbeat...')
    } else if (hb.beat !== lastBeat) {
      lastBeat = hb.beat
      alerted  = false
      const src = hb.onChain ? `on-chain TX: ${hb.txHash}` : 'off-chain'
      log('💓', GREEN, `Beat #${hb.beat} received — ${hb.iso} (${src})`)
    } else if (hb.age > TIMEOUT_MS && !alerted) {
      alerted = true
      log('🚨', '\x1b[31m', `HEARTBEAT FAILURE — last beat was ${Math.round(hb.age / 1000)}s ago`)
      log('⚡', '\x1b[31m', 'Triggering resurrection protocol...')
      vaultState.status = 'triggered'
      console.log(`\n   Vault keys #2+#3 activated by Swiss 6022 (insurer)`)
      console.log(`   → New VPS spawned`)
      console.log(`   → Memory files restored`)
      console.log(`   → LLM reconnected via OpenClaw`)
      console.log(`   → Agent back online ✅`)
      return
    } else if (hb.age) {
      const remaining = Math.max(0, TIMEOUT_MS - hb.age)
      if (remaining > 0) {
        log('⏱️ ', YELLOW, `Last beat #${hb.beat} — ${Math.round(hb.age / 1000)}s ago — timeout in ${Math.round(remaining / 1000)}s`)
      }
    }

    setTimeout(monitor, 5000)
  }

  monitor()
}

main().catch(console.error)
