/**
 * K-Life Agent — Monsieur K
 * 
 * An autonomous AI agent (running on OpenClaw) with a WDK self-custodial wallet that:
 * - Holds EVM wallet on Polygon Amoy (via @tetherto/wdk-wallet-evm)
 * - Checks USDT balance (ERC-20 via WDK)
 * - Emits heartbeat signals every N seconds
 * - Falls back to off-chain heartbeat if balance too low
 * - Stops heartbeating when "crashed" — triggering K-Life insurance
 * 
 * Usage:
 *   node agent.js                          # normal mode (infinite)
 *   MAX_BEATS=3 node agent.js              # crash after 3 beats
 *   SEED_PHRASE="..." node agent.js        # use specific wallet
 */

import WalletManagerEvm from '@tetherto/wdk-wallet-evm'
import { readFileSync, writeFileSync, existsSync } from 'fs'

// ── Config ────────────────────────────────────────────────────────────────────

const HEARTBEAT_INTERVAL_MS = parseInt(process.env.HEARTBEAT_INTERVAL_MS || '30000')
const MAX_BEATS             = parseInt(process.env.MAX_BEATS || '0') // 0 = infinite
const SEED_FILE             = '.agent-seed'

// Polygon Amoy testnet (same network as Protocol 6022)
const POLYGON_AMOY_RPC      = 'https://rpc-amoy.polygon.technology'
const CHAIN_ID              = 80002

// USDT on Polygon Amoy testnet (mock — WDK ERC-20 balance check demo)
// For real USDT₮ testnet: use Pimlico faucet on Sepolia (ERC-4337)
// https://dashboard.pimlico.io/test-erc20-faucet
const USDT_AMOY             = '0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582'

// ── Wallet Setup ──────────────────────────────────────────────────────────────

function loadOrCreateSeed() {
  // Priority: env var → .agent-seed file → generate new
  if (process.env.SEED_PHRASE) {
    console.log('🔑 Using SEED_PHRASE from environment')
    return process.env.SEED_PHRASE.trim()
  }
  if (existsSync(SEED_FILE)) {
    const seed = readFileSync(SEED_FILE, 'utf8').trim()
    console.log('🎩 Loaded existing seed from .agent-seed')
    return seed
  }
  const seed = WalletManagerEvm.getRandomSeedPhrase()
  writeFileSync(SEED_FILE, seed)
  console.log('🎩 Generated new seed phrase (saved to .agent-seed)')
  return seed
}

async function setupWallet(seed) {
  const wallet = new WalletManagerEvm(seed, {
    provider: POLYGON_AMOY_RPC,
    chainId: CHAIN_ID
  })
  const account = await wallet.getAccount(0)
  const address = await account.getAddress()
  return { wallet, account, address }
}

// ── Balance Checks ────────────────────────────────────────────────────────────

async function checkBalances(account, address) {
  let polBalance = 0n
  let usdtBalance = '0'

  try {
    polBalance = await account.getBalance()
    const pol = Number(polBalance) / 1e18
    console.log(`💰 POL balance : ${pol.toFixed(4)} POL`)
  } catch (e) {
    console.log(`💰 POL balance : (unavailable — ${e.message.slice(0, 60)})`)
  }

  try {
    usdtBalance = await account.getTokenBalance(USDT_AMOY)
    const usdt = Number(usdtBalance) / 1e6  // USDT has 6 decimals
    console.log(`💵 USDT balance: ${usdt.toFixed(2)} USDT₮  (via WDK ERC-20)`)
    console.log(`   Contract    : ${USDT_AMOY}`)
  } catch (e) {
    console.log(`💵 USDT balance: (unavailable — ${e.message.slice(0, 60)})`)
  }

  return { polBalance, usdtBalance }
}

// ── Heartbeat ─────────────────────────────────────────────────────────────────

/**
 * Emit a heartbeat.
 * If wallet has funds → real on-chain tx on Polygon Amoy
 * If wallet is empty  → off-chain fallback (still writes heartbeat.json)
 */
async function emitHeartbeat(account, address, beatNumber, polBalance) {
  const ts  = Date.now()
  const iso = new Date(ts).toISOString()
  const data = `K-Life:heartbeat:${beatNumber}:${address}:${iso}`

  let txHash = null

  if (polBalance > 0n) {
    try {
      const tx = await account.sendTransaction({
        to:    address,  // self-send — heartbeat recorded on-chain
        value: 0n,
        data:  '0x' + Buffer.from(data).toString('hex')
      })
      txHash = tx.hash
      console.log(`💓 Heartbeat #${beatNumber} — ${iso}`)
      console.log(`   📡 TX: https://amoy.polygonscan.com/tx/${txHash}`)
    } catch (e) {
      console.log(`💓 Heartbeat #${beatNumber} (off-chain) — ${iso}`)
      console.log(`   ⚠️  TX failed: ${e.message.slice(0, 80)}`)
    }
  } else {
    console.log(`💓 Heartbeat #${beatNumber} (off-chain) — ${iso}`)
    console.log(`   ℹ️  No POL balance — fund wallet for on-chain heartbeats`)
    console.log(`   🔗 Faucet: https://faucet.polygon.technology`)
  }

  const beat = { agent: address, beat: beatNumber, timestamp: ts, iso, txHash, onChain: txHash !== null }
  writeFileSync('heartbeat.json', JSON.stringify(beat, null, 2))
  return beat
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🎩 ════════════════════════════════════════════════')
  console.log('   K-Life Agent — Monsieur K')
  console.log('   Autonomous AI Agent Insurance Protocol')
  console.log('   Powered by WDK (Tether) × OpenClaw × Protocol 6022')
  console.log('🎩 ════════════════════════════════════════════════\n')

  // 1. Setup wallet
  const seed = loadOrCreateSeed()
  const { wallet, account, address } = await setupWallet(seed)

  console.log(`\n📍 Agent wallet  : ${address}`)
  console.log(`🔗 Polygonscan   : https://amoy.polygonscan.com/address/${address}`)
  console.log(`🤖 Agent runtime : OpenClaw (https://openclaw.ai)`)
  console.log(`🏛️  Protocol 6022 : https://6022.link\n`)

  // 2. Check balances (POL + USDT via WDK ERC-20)
  const { polBalance } = await checkBalances(account, address)

  // 3. Log insurance status
  console.log(`\n🛡️  K-Life status : ACTIVE`)
  console.log(`   Plan          : Silver — restart + memory restore + LLM reconnect`)
  console.log(`   Premium       : 300 USDT₮ / month (Polygon Amoy testnet)`)
  console.log(`   Heartbeat     : every ${HEARTBEAT_INTERVAL_MS / 1000}s`)
  console.log(`   On-chain      : ${polBalance > 0n ? '✅ enabled' : '⚠️  off-chain fallback (fund wallet)'}`)
  if (MAX_BEATS > 0) {
    console.log(`   Crash sim     : after ${MAX_BEATS} beats\n`)
  } else {
    console.log(`   Mode          : continuous (infinite)\n`)
  }

  // 4. Heartbeat loop
  let beatNumber = 0
  console.log('▶️  Heartbeat loop started...\n')

  const loop = async () => {
    beatNumber++
    await emitHeartbeat(account, address, beatNumber, polBalance)

    if (MAX_BEATS > 0 && beatNumber >= MAX_BEATS) {
      console.log(`\n💥 Agent crashed after ${MAX_BEATS} beats (simulation).`)
      console.log('   Heartbeats stopped. K-Life watchdog will detect absence.')
      console.log('   Resurrection will trigger after timeout...\n')
      return
    }

    setTimeout(loop, HEARTBEAT_INTERVAL_MS)
  }

  loop()
}

main().catch(console.error)
