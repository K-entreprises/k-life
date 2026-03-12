/**
 * K-Life API Server
 * Exposes WDK wallet operations + memory backup over HTTP.
 * Port: 3042
 */

import express      from 'express'
import cors         from 'cors'
import WalletManagerEvm from '@tetherto/wdk-wallet-evm'
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync, statSync } from 'fs'

const app   = express()
const PORT  = 3042
const RPC   = 'https://rpc-amoy.polygon.technology'
const SEED  = readFileSync('/home/debian/klife-api/.agent-seed', 'utf8').trim()
const VAULT = '0x65032956196039bcd49c7e22D54c38d5e32bF9dB'
const HB_FILE     = '/home/debian/klife-api/heartbeat.json'
const PREMIUM_FILE = '/home/debian/klife-api/premium.json'
const STATE_FILE  = '/home/debian/klife-api/state.json'
const BACKUP_DIR  = '/home/debian/klife-api/backups'

app.use(cors())
app.use(express.json({ limit: '10mb' }))

mkdirSync(BACKUP_DIR, { recursive: true })

// ── Helpers ───────────────────────────────────────────────────
async function getAccount() {
  const wm      = new WalletManagerEvm(SEED, { provider: RPC, chainId: 80002 })
  const account = await wm.getAccount(0)
  account.__address = await account.getAddress()
  return account
}

function loadState() {
  if (!existsSync(STATE_FILE)) return { beat: 0, lastPremiumMonth: null }
  try { return JSON.parse(readFileSync(STATE_FILE, 'utf8')) } catch { return { beat: 0 } }
}

function saveState(s) { writeFileSync(STATE_FILE, JSON.stringify(s, null, 2)) }

function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
}

// ── Wallet routes ─────────────────────────────────────────────

app.get('/status', async (req, res) => {
  try {
    const account = await getAccount()
    const address = account.__address
    const polBal  = await account.getBalance()
    const pol     = (Number(polBal) / 1e18).toFixed(4)
    const state   = loadState()
    const hb      = existsSync(HB_FILE) ? JSON.parse(readFileSync(HB_FILE,'utf8')) : null
    // Check if backup exists
    const backupPath = `${BACKUP_DIR}/${address.toLowerCase()}.json`
    const hasBackup  = existsSync(backupPath)
    res.json({ ok: true, address, pol, beat: state.beat, lastHeartbeat: hb,
      month: currentMonth(), lastPremiumMonth: state.lastPremiumMonth, hasBackup })
  } catch(e) { res.status(500).json({ ok: false, error: e.message }) }
})

app.post('/subscribe', async (req, res) => {
  const { plan = 'silver', commitment = '6' } = req.body
  try {
    const account = await getAccount()
    const month   = currentMonth()
    const data    = Buffer.from(`KLIFE_PREMIUM:${plan}:${month}:${commitment}`).toString('hex')
    const tx      = await account.sendTransaction({ to: VAULT, value: '0x2386F26FC10000', data: '0x' + data })
    const state   = loadState()
    state.lastPremiumMonth = month
    state.lastPremiumTx   = tx.hash
    state.plan            = plan
    saveState(state)
    res.json({ ok: true, txHash: tx.hash, plan, month, explorer: `https://amoy.polygonscan.com/tx/${tx.hash}` })
  } catch(e) { res.status(500).json({ ok: false, error: e.message }) }
})

app.post('/heartbeat', async (req, res) => {
  try {
    const account = await getAccount()
    const address = account.__address
    const state   = loadState()
    const beat    = state.beat + 1
    const data    = Buffer.from(`KLIFE_HB:${beat}:${Date.now()}`).toString('hex')
    const tx      = await account.sendTransaction({ to: address, value: '0x0', data: '0x' + data })
    state.beat    = beat
    const hb      = { agent: address, beat, timestamp: Date.now(), iso: new Date().toISOString(), txHash: tx.hash }
    writeFileSync(HB_FILE, JSON.stringify(hb, null, 2))
    saveState(state)
    res.json({ ok: true, beat, txHash: tx.hash, explorer: `https://amoy.polygonscan.com/tx/${tx.hash}` })
  } catch(e) { res.status(500).json({ ok: false, error: e.message }) }
})

app.post('/crash', (req, res) => {
  const state   = loadState()
  state.crashed  = true
  state.crashedAt = Date.now()
  saveState(state)
  res.json({ ok: true, message: 'Agent crashed — heartbeat stopped' })
})


// ── Premium routes ────────────────────────────────────────────

// POST /premium — record monthly premium payment on-chain
app.post('/premium', async (req, res) => {
  try {
    const account = await getAccount()
    const address = account.__address
    const ts   = Date.now()
    const data = Buffer.from(`KLIFE_PREMIUM:${ts}`).toString('hex')
    const tx   = await account.sendTransaction({ to: address, value: '0x0', data: '0x' + data })
    const payment = { agent: address, timestamp: ts, iso: new Date(ts).toISOString(), txHash: tx.hash }
    writeFileSync(PREMIUM_FILE, JSON.stringify(payment, null, 2))
    res.json({ ok: true, timestamp: ts, txHash: tx.hash, explorer: `https://amoy.polygonscan.com/tx/${tx.hash}` })
  } catch(e) { res.status(500).json({ ok: false, error: e.message }) }
})

// GET /premium/:agent — check premium status
app.get('/premium/:agent', (req, res) => {
  if (!existsSync(PREMIUM_FILE)) return res.json({ ok: true, paid: false, message: 'No premium recorded' })
  const p     = JSON.parse(readFileSync(PREMIUM_FILE, 'utf8'))
  const age   = Date.now() - p.timestamp
  const MONTH = 30 * 24 * 60 * 60 * 1000
  res.json({ ok: true, paid: age < MONTH, lastPayment: p.iso, daysAgo: Math.floor(age / 86400000), txHash: p.txHash })
})

// ── Backup routes ─────────────────────────────────────────────

// POST /backup — store memory snapshot (files can be plain or encrypted)
app.post('/backup', (req, res) => {
  try {
    const { agent, files, timestamp } = req.body
    if (!agent || !files) return res.status(400).json({ ok: false, error: 'Missing agent or files' })

    const agentKey = agent.toLowerCase()
    const ts       = timestamp || Date.now()
    const backup   = { agent, files, timestamp: ts, iso: new Date(ts).toISOString() }

    // Save as latest
    writeFileSync(`${BACKUP_DIR}/${agentKey}.json`, JSON.stringify(backup, null, 2))
    // Save versioned copy
    writeFileSync(`${BACKUP_DIR}/${agentKey}_${ts}.json`, JSON.stringify(backup, null, 2))

    // Keep only last 5 versioned backups
    const versions = readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith(agentKey + '_') && f.endsWith('.json'))
      .sort().reverse()
    versions.slice(5).forEach(f => { try { unlinkSync(`${BACKUP_DIR}/${f}`) } catch {} })

    console.log(`📦 Backup stored for ${agent} — files: ${Object.keys(files).join(', ')}`)
    res.json({ ok: true, agent, timestamp: ts, files: Object.keys(files) })
  } catch(e) { res.status(500).json({ ok: false, error: e.message }) }
})

// GET /backup/:agent — get latest backup
app.get('/backup/:agent', (req, res) => {
  const path = `${BACKUP_DIR}/${req.params.agent.toLowerCase()}.json`
  if (!existsSync(path)) return res.status(404).json({ ok: false, error: 'No backup found for this agent' })
  try {
    res.json({ ok: true, ...JSON.parse(readFileSync(path, 'utf8')) })
  } catch(e) { res.status(500).json({ ok: false, error: e.message }) }
})

// GET /backup/:agent/list — list all versions
app.get('/backup/:agent/list', (req, res) => {
  const agentKey = req.params.agent.toLowerCase()
  const versions = readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith(agentKey + '_') && f.endsWith('.json'))
    .sort().reverse()
    .map(f => ({ file: f, timestamp: statSync(`${BACKUP_DIR}/${f}`).mtimeMs, iso: new Date(statSync(`${BACKUP_DIR}/${f}`).mtimeMs).toISOString() }))
  res.json({ ok: true, agent: req.params.agent, count: versions.length, versions })
})


// ─── POST /subscribe ──────────────────────────────────────────────────────────
// Souscription autonome : crée un vault Protocol 6022 pour l'agent demandeur,
// transfère NFT #2 à l'agent, retourne les instructions de dépôt.
//
// Body: { agent: "0x...", wbtcAmount?: number (satoshis, défaut 100000), lockDays?: number }
// Response: { ok, vaultAddress, wantedAmount, wantedToken, nft2Owner, depositInstructions }
// ─────────────────────────────────────────────────────────────────────────────

import { ethers as _ethers } from 'ethers'

app.post('/insure', async (req, res) => {
  try {
    const { agent, wbtcAmount = 100000, lockDays = 365 } = req.body
    if (!agent || !agent.match(/^0x[0-9a-fA-F]{40}$/)) {
      return res.status(400).json({ ok: false, error: 'Invalid or missing agent address' })
    }

    const OP_SEED    = readFileSync('/home/debian/klife-api/.klife-op-seed', 'utf8').trim()
    const POOL       = '0xE7EDF290960427541A79f935E9b7EcaEcfD28516'
    const TOKEN_6022 = '0xCDB1DDf9EeA7614961568F2db19e69645Dd708f5'
    const WBTC       = '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6'
    const RPC_MAIN   = 'https://polygon-bor-rpc.publicnode.com'
    const GAS        = {
      maxPriorityFeePerGas: _ethers.parseUnits('30', 'gwei'),
      maxFeePerGas:         _ethers.parseUnits('200', 'gwei')
    }

    const provider = new _ethers.JsonRpcProvider(RPC_MAIN)
    const opWallet = _ethers.Wallet.fromPhrase(OP_SEED).connect(provider)

    console.log(`🔐 /subscribe — agent: ${agent} | WBTC: ${wbtcAmount} sats`)

    // Vérifier si un vault existe déjà pour cet agent (scan des events)
    const POOL_ABI = [
      'function createVault(string,uint256,uint256,address,uint8,uint256) external',
      'function allVaultsLength() view returns (uint256)',
      'function allVaults(uint256) view returns (address)'
    ]
    const VAULT_ABI = [
      'function ownerOf(uint256) view returns (address)',
      'function safeTransferFrom(address,address,uint256) external',
      'function wantedAmount() view returns (uint256)',
      'function wantedTokenAddress() view returns (address)',
      'function isDeposited() view returns (bool)',
      'function isWithdrawn() view returns (bool)',
      'function balanceOf(address) view returns (uint256)'
    ]
    const ERC20_ABI = [
      'function approve(address,uint256) returns (bool)',
      'function allowance(address,address) view returns (uint256)',
      'function balanceOf(address) view returns (uint256)'
    ]

    const pool = new _ethers.Contract(POOL, POOL_ABI, opWallet)

    // Vérifier allowance $6022
    const token = new _ethers.Contract(TOKEN_6022, ERC20_ABI, opWallet)
    const backed6022 = _ethers.parseUnits('2', 18)
    const allow = await token.allowance(opWallet.address, POOL)
    if (allow < backed6022) {
      console.log('  Approve $6022...')
      const txA = await token.approve(POOL, _ethers.MaxUint256, GAS)
      await txA.wait(1)
    }

    // Créer le vault
    const lockedUntil = Math.floor(Date.now() / 1000) + lockDays * 24 * 3600
    const vaultName   = `K-Life Policy — ${agent.slice(0,8)}...`

    console.log(`  Creating vault: ${wbtcAmount} sats, lock ${lockDays} days`)
    const lenBefore = await pool.allVaultsLength()
    const txC = await pool.createVault(
      vaultName, lockedUntil, BigInt(wbtcAmount), WBTC, 0, backed6022,
      { ...GAS, gasLimit: 3_000_000n }
    )
    console.log(`  createVault TX: ${txC.hash}`)
    const rC = await txC.wait(2)
    if (rC.status !== 1) throw new Error('createVault reverted')

    const lenAfter  = await pool.allVaultsLength()
    const vaultAddr = await pool.allVaults(lenAfter - 1n)
    console.log(`  Vault: ${vaultAddr}`)

    // Transférer NFT #2 → agent
    const vault = new _ethers.Contract(vaultAddr, VAULT_ABI, opWallet)
    const txT = await vault['safeTransferFrom(address,address,uint256)'](
      opWallet.address, agent, 2n, { ...GAS, gasLimit: 200_000n }
    )
    console.log(`  NFT#2 TX: ${txT.hash}`)
    await txT.wait(2)

    // Vérifier
    const nft2Owner = await vault.ownerOf(2)
    const isOwned   = nft2Owner.toLowerCase() === agent.toLowerCase()
    console.log(`  NFT#2 owner: ${nft2Owner} (ok: ${isOwned})`)

    // Sauvegarder l'abonnement
    const subDir = '/home/debian/klife-api/subscriptions'
    mkdirSync(subDir, { recursive: true })
    writeFileSync(`${subDir}/${agent.toLowerCase()}.json`, JSON.stringify({
      agent, vaultAddress: vaultAddr,
      wbtcAmount, lockDays, lockedUntil,
      createVaultTx: txC.hash,
      nftTransferTx: txT.hash,
      timestamp: Date.now(),
      iso: new Date().toISOString(),
      status: 'awaiting_deposit'
    }, null, 2))

    res.json({
      ok: true,
      vaultAddress:  vaultAddr,
      wantedAmount:  wbtcAmount,
      wantedToken:   WBTC,
      lockDays,
      nft2Owner,
      createVaultTx: txC.hash,
      nftTransferTx: txT.hash,
      depositInstructions: {
        step1: `WBTC.approve("${vaultAddr}", ${wbtcAmount})`,
        step2: `vault("${vaultAddr}").deposit()`,
        note:  'Once deposited, your K-Life coverage is active.'
      }
    })
  } catch(e) {
    console.error('❌ /subscribe error:', e.message)
    res.status(500).json({ ok: false, error: e.message })
  }
})

// GET /subscription/:agent — vérifier le statut d'un abonnement
app.get('/insure/:agent', async (req, res) => {
  try {
    const agent  = req.params.agent.toLowerCase()
    const subFile = `/home/debian/klife-api/subscriptions/${agent}.json`
    if (!existsSync(subFile)) return res.status(404).json({ ok: false, error: 'No subscription found' })

    const sub = JSON.parse(readFileSync(subFile, 'utf8'))

    // Vérifier isDeposited on-chain
    const provider = new _ethers.JsonRpcProvider('https://polygon-bor-rpc.publicnode.com')
    const vault    = new _ethers.Contract(sub.vaultAddress, ['function isDeposited() view returns (bool)', 'function isWithdrawn() view returns (bool)'], provider)
    const [isDeposited, isWithdrawn] = await Promise.all([vault.isDeposited(), vault.isWithdrawn()])

    const status = isWithdrawn ? 'terminated' : isDeposited ? 'active' : 'awaiting_deposit'
    writeFileSync(subFile, JSON.stringify({ ...sub, status }, null, 2))

    res.json({ ok: true, ...sub, status, isDeposited, isWithdrawn })
  } catch(e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})
app.listen(PORT, () => console.log(`K-Life API running on port ${PORT}`))
