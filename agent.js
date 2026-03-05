/**
 * K-Life Agent — Monsieur K
 * An autonomous AI agent with a WDK wallet that:
 * - Holds a self-custodial wallet (EVM / Sepolia testnet)
 * - Pays insurance premium to K-Life vault
 * - Emits heartbeat signals every 30 seconds
 * - Stops heartbeating when "crashed" (to trigger insurance)
 */

import WDK from '@tetherto/wdk'
import WalletManagerEvm from '@tetherto/wdk-wallet-evm'
import { readFileSync, writeFileSync, existsSync } from 'fs'

const SEED_FILE = '.agent-seed'
const HEARTBEAT_INTERVAL_MS = parseInt(process.env.HEARTBEAT_INTERVAL_MS || '30000')
const SEPOLIA_RPC = 'https://ethereum-sepolia-rpc.publicnode.com'

// ── Wallet Setup ─────────────────────────────────────────────────────────────

function loadOrCreateSeed() {
  if (existsSync(SEED_FILE)) {
    const seed = readFileSync(SEED_FILE, 'utf8').trim()
    console.log('🎩 Loaded existing seed phrase')
    return seed
  }
  const seed = WDK.getRandomSeedPhrase()
  writeFileSync(SEED_FILE, seed)
  console.log('🎩 Generated new seed phrase (saved to .agent-seed)')
  return seed
}

async function setupWallet(seed) {
  const wdk = new WDK(seed).registerWallet('sepolia', WalletManagerEvm, {
    provider: SEPOLIA_RPC,
    chainId: 11155111
  })
  const account = await wdk.getAccount('sepolia')
  const address = account.__address || account.address
  return { wdk, address }
}

// ── Heartbeat ─────────────────────────────────────────────────────────────────

/**
 * Emit a heartbeat.
 * In a full implementation: sends a minimal on-chain tx to K-Life monitor contract.
 * For demo: logs + writes to heartbeat.json (monitor reads this).
 */
async function emitHeartbeat(address, beatNumber) {
  const ts = Date.now()
  const beat = { agent: address, beat: beatNumber, timestamp: ts, iso: new Date(ts).toISOString() }
  writeFileSync('heartbeat.json', JSON.stringify(beat, null, 2))
  console.log(`💓 Heartbeat #${beatNumber} — ${beat.iso}`)
  return beat
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🎩 ════════════════════════════════════════')
  console.log('   K-Life Agent — Monsieur K')
  console.log('   Autonomous AI Agent Insurance Demo')
  console.log('🎩 ════════════════════════════════════════\n')

  // 1. Setup wallet
  const seed = loadOrCreateSeed()
  const { wdk, address } = await setupWallet(seed)

  console.log(`\n📍 Agent wallet address: ${address}`)
  console.log(`🔗 View on Sepolia: https://sepolia.etherscan.io/address/${address}`)

  // 2. Check balance
  try {
    const balances = await wdk.getBalances('sepolia', address)
    console.log(`💰 Balance: ${JSON.stringify(balances)}`)
  } catch (e) {
    console.log(`💰 Balance: (testnet — fund at https://sepoliafaucet.com)`)
  }

  // 3. Log insurance status
  console.log(`\n🛡️  K-Life insurance: ACTIVE`)
  console.log(`   Plan: Silver (restart + memory restoration)`)
  console.log(`   Premium: 300 USDT / month (Sepolia testnet)`)
  console.log(`   Heartbeat interval: ${HEARTBEAT_INTERVAL_MS / 1000}s\n`)

  // 4. Start heartbeat loop
  let beatNumber = 0
  const maxBeats = parseInt(process.env.MAX_BEATS || '0') // 0 = infinite

  console.log('▶️  Starting heartbeat loop...\n')

  const loop = async () => {
    beatNumber++
    await emitHeartbeat(address, beatNumber)

    if (maxBeats > 0 && beatNumber >= maxBeats) {
      console.log(`\n💥 Agent reached max beats (${maxBeats}). Simulating crash...`)
      console.log('   Heartbeats stopped. K-Life monitor will detect absence.')
      console.log('   Resurrection protocol will trigger in ~90s...\n')
      return
    }

    setTimeout(loop, HEARTBEAT_INTERVAL_MS)
  }

  loop()
}

main().catch(console.error)
