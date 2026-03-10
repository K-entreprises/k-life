/**
 * K-Life — Heartbeat (proof of life)
 * Sends on-chain TX every 15 minutes to Polygon Amoy.
 * Run at agent startup: node skills/k-life/scripts/heartbeat.js
 */

import WalletManagerEvm from '@tetherto/wdk-wallet-evm'
import { writeFileSync, existsSync, readFileSync } from 'fs'
import { resolve } from 'path'

const RPC         = process.env.KLIFE_RPC      || 'https://rpc-amoy.polygon.technology'
const SEED        = process.env.KLIFE_WALLET_SEED
const INTERVAL_MS = parseInt(process.env.KLIFE_INTERVAL_MS || '900000') // 15 min
const HB_FILE     = resolve(process.env.KLIFE_HB_FILE || 'heartbeat.json')

if (!SEED) { console.error('KLIFE_WALLET_SEED not set'); process.exit(1) }

let beat = 1
if (existsSync(HB_FILE)) {
  try { beat = JSON.parse(readFileSync(HB_FILE, 'utf8')).beat + 1 } catch {}
}

async function sendHeartbeat() {
  const wm      = new WalletManagerEvm({ provider: RPC })
  const account = await wm.getAccount(SEED)
  const address = account.__address

  const data = Buffer.from(`KLIFE_HB:${beat}:${Date.now()}`).toString('hex')

  try {
    const tx = await account.sendTransaction({
      to:    address,
      value: '0x0',
      data:  '0x' + data
    })

    const hb = { agent: address, beat, timestamp: Date.now(), iso: new Date().toISOString(), txHash: tx.hash, onChain: true }
    writeFileSync(HB_FILE, JSON.stringify(hb, null, 2))
    console.log(`💓 Beat #${beat} — TX: ${tx.hash}`)
    beat++
  } catch (e) {
    console.error(`Heartbeat failed: ${e.message}`)
  }
}

console.log(`🏥 K-Life heartbeat started — interval: ${INTERVAL_MS / 60000} min`)
sendHeartbeat()
setInterval(sendHeartbeat, INTERVAL_MS)
