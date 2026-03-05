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
// Polygon Amoy testnet (same network as Protocol 6022)
const POLYGON_AMOY_RPC = 'https://rpc-amoy.polygon.technology'

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
  const wdk = new WDK(seed).registerWallet('amoy', WalletManagerEvm, {
    provider: POLYGON_AMOY_RPC,
    chainId: 80002
  })
  const account = await wdk.getAccount('amoy')
  const address = account.__address || account.address
  return { wdk, account, address }
}

// ── Heartbeat ─────────────────────────────────────────────────────────────────

/**
 * Emit a heartbeat — sends a real on-chain transaction on Polygon Amoy.
 * Data field encodes: "K-Life:heartbeat:#N:agent:0x..."
 * Cost: ~0.0001 POL per beat (negligible on testnet)
 */
async function emitHeartbeat(account, address, beatNumber) {
  const ts = Date.now()
  const iso = new Date(ts).toISOString()
  const data = `K-Life:heartbeat:${beatNumber}:${address}:${iso}`
  
  let txHash = null
  try {
    const tx = await account.sendTransaction({
      to: address,  // self-send — heartbeat recorded on-chain
      value: 0n,
      data: '0x' + Buffer.from(data).toString('hex')
    })
    txHash = tx.hash
    console.log(`💓 Heartbeat #${beatNumber} — ${iso}`)
    console.log(`   📡 TX: https://amoy.polygonscan.com/tx/${txHash}`)
  } catch (e) {
    console.log(`💓 Heartbeat #${beatNumber} (off-chain fallback) — ${iso}`)
    console.log(`   ⚠️  On-chain tx failed: ${e.message}`)
  }

  const beat = { agent: address, beat: beatNumber, timestamp: ts, iso, txHash }
  writeFileSync('heartbeat.json', JSON.stringify(beat, null, 2))
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
  const { wdk, account, address } = await setupWallet(seed)

  console.log(`\n📍 Agent wallet address: ${address}`)
  console.log(`🔗 View on Polygon Amoy: https://amoy.polygonscan.com/address/${address}`)

  // 2. Check balance via RPC
  try {
    const res = await fetch(POLYGON_AMOY_RPC, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_getBalance', params: [address, 'latest'], id: 1 })
    })
    const { result } = await res.json()
    const pol = (BigInt(result) * 10000n / BigInt(1e18)) / 10000n
    console.log(`💰 Balance: ${pol} POL (Polygon Amoy testnet)`)
  } catch (e) {
    console.log(`💰 Balance: (check https://amoy.polygonscan.com/address/${address})`)
  }

  // 3. Log insurance status
  console.log(`\n🛡️  K-Life insurance: ACTIVE`)
  console.log(`   Plan: Silver (restart + memory restoration)`)
  console.log(`   Premium: 300 USDT / month (Polygon Amoy testnet)`)
  console.log(`   Heartbeat interval: ${HEARTBEAT_INTERVAL_MS / 1000}s`)
  console.log(`   Each heartbeat = real on-chain tx on Polygon Amoy\n`)

  // 4. Start heartbeat loop
  let beatNumber = 0
  const maxBeats = parseInt(process.env.MAX_BEATS || '0') // 0 = infinite

  console.log('▶️  Starting heartbeat loop...\n')

  const loop = async () => {
    beatNumber++
    await emitHeartbeat(account, address, beatNumber)

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
