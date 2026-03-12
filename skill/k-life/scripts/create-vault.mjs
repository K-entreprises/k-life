/**
 * K-Life — Étape 2 : Souscription d'un agent (création d'un CollateralVault)
 *
 * Appelé quand un agent demande une couverture K-Life.
 * K-Life crée le vault, garde 2 NFTs (clés), envoie le 3ème à l'agent.
 * L'agent dépose ensuite 100 USDT via deposit().
 *
 * Usage :
 *   KLIFE_SEED="..." \
 *   KLIFE_POOL="0x..." \
 *   AGENT_NAME="Monsieur K" \
 *   AGENT_WALLET="0x..." \
 *   COLLATERAL_USDT=100 \
 *   node create-vault.mjs
 *
 * Après l'exécution, l'agent doit appeler deposit() sur le vault.
 * Le script affiche l'adresse du vault + les instructions.
 */

import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { ethers } = require('ethers')

// ── Config ────────────────────────────────────────────────────────────────────
const SEED            = process.env.KLIFE_SEED
const RPC             = process.env.POLYGON_RPC     || 'https://polygon-bor-rpc.publicnode.com'
const POOL_ADDR       = process.env.KLIFE_POOL       // adresse RewardPool K-Life
const AGENT_NAME      = process.env.AGENT_NAME      || 'K-Life Agent'
const AGENT_WALLET    = process.env.AGENT_WALLET    // wallet de l'agent (reçoit NFT #2)
const COLLATERAL_USDT = process.env.COLLATERAL_USDT || '100'
const LOCK_MONTHS     = parseInt(process.env.LOCK_MONTHS || '12')

const TOKEN_6022 = '0xCDB1DDf9EeA7614961568F2db19e69645Dd708f5'
const USDT_POLY  = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F' // 6 decimals
const FEES_PCT   = 2 // 2% du collatéral en $6022

const POOL_ABI = [
  'function createVault(string _name, uint256 _lockedUntil, uint256 _wantedAmount, address _wantedTokenAddress, uint8 _storageType, uint256 _backedValueProtocolToken) external',
  'function allVaultsLength() view returns (uint256)',
  'function allVaults(uint256) view returns (address)',
  'event VaultCreated(address indexed vault)'
]

const VAULT_ABI = [
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function balanceOf(address owner) view returns (uint256)',
  'function safeTransferFrom(address from, address to, uint256 tokenId) external',
  'function wantedAmount() view returns (uint256)',
  'function wantedTokenAddress() view returns (address)',
  'function lockedUntil() view returns (uint256)',
  'function isDeposited() view returns (bool)',
  'function deposit() external',
  'function MAX_TOKENS() view returns (uint256)',
  'function WITHDRAW_NFTS_EARLY() view returns (uint256)',
  'function WITHDRAW_NFTS_LATE() view returns (uint256)',
  'function vaultOverview() view returns (tuple(string name, address creator, uint256 wantedAmount, address wantedTokenAddress, uint256 lockedUntil, bool isDeposited, bool isWithdrawn))'
]

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)'
]

if (!SEED)         { console.error('❌ KLIFE_SEED manquant');   process.exit(1) }
if (!POOL_ADDR)    { console.error('❌ KLIFE_POOL manquant');    process.exit(1) }
if (!AGENT_WALLET) { console.error('❌ AGENT_WALLET manquant'); process.exit(1) }

// ── Main ──────────────────────────────────────────────────────────────────────
const provider  = new ethers.providers.JsonRpcProvider(RPC)
const wallet    = ethers.Wallet.fromMnemonic(SEED).connect(provider)

console.log('\n🔐 K-Life — Création vault pour', AGENT_NAME)
console.log('═'.repeat(52))
console.log('K-Life wallet :', wallet.address)
console.log('Agent wallet  :', AGENT_WALLET)
console.log('Pool          :', POOL_ADDR)

// Calcul des paramètres
const usdtDecimals   = 6
const token6022      = new ethers.Contract(TOKEN_6022, ERC20_ABI, wallet)
const tok6022Dec     = await token6022.decimals()

const wantedAmount   = ethers.utils.parseUnits(COLLATERAL_USDT, usdtDecimals)
const lockedUntil    = Math.floor(Date.now() / 1000) + LOCK_MONTHS * 30 * 24 * 3600
const storageType    = 0 // ERC20 (USDT)

// backedValueProtocolToken = 2% du collatéral (en $6022 tokens)
// À ajuster selon le prix du $6022 — pour la démo on utilise une valeur fixe
const backed6022     = ethers.utils.parseUnits(
  String(Math.ceil(parseFloat(COLLATERAL_USDT) * FEES_PCT / 100)),
  tok6022Dec
)

console.log('\nParamètres vault :')
console.log('  Collatéral  :', COLLATERAL_USDT, 'USDT')
console.log('  $6022 stake :', ethers.utils.formatUnits(backed6022, tok6022Dec), '(', FEES_PCT, '% fee)')
console.log('  Lock        :', LOCK_MONTHS, 'mois (', new Date(lockedUntil * 1000).toISOString().slice(0,10), ')')
console.log('  Type        : ERC20 (USDT)')

// Vérifier solde $6022
const bal6022 = await token6022.balanceOf(wallet.address)
console.log('\n$6022 solde   :', ethers.utils.formatUnits(bal6022, tok6022Dec))
if (bal6022.lt(backed6022)) {
  console.error('❌ Solde $6022 insuffisant pour le vault')
  process.exit(1)
}

// Approve $6022 → Pool
console.log('\n📝 Approve $6022 → RewardPool...')
const approveTx = await token6022.approve(POOL_ADDR, backed6022)
console.log('   TX:', approveTx.hash)
await approveTx.wait()
console.log('   ✅ Approuvé')

// createVault
console.log('\n🏗️  Création du vault...')
const pool     = new ethers.Contract(POOL_ADDR, POOL_ABI, wallet)
const createTx = await pool.createVault(
  AGENT_NAME,
  lockedUntil,
  wantedAmount,
  USDT_POLY,
  storageType,
  backed6022
)
console.log('   TX:', createTx.hash)
const receipt  = await createTx.wait()

// Récupérer l'adresse du vault
const iface    = new ethers.utils.Interface(POOL_ABI)
let vaultAddr  = null
for (const log of receipt.logs) {
  try {
    const p = iface.parseLog(log)
    if (p.name === 'VaultCreated') vaultAddr = p.args.vault
  } catch {}
}
if (!vaultAddr) {
  const len = await pool.allVaultsLength()
  vaultAddr  = await pool.allVaults(len.sub(1))
}

console.log('\n✅ Vault créé :', vaultAddr)

// Lire la distribution des NFTs (3 tokens : #0, #1, #2)
const vault = new ethers.Contract(vaultAddr, VAULT_ABI, wallet)
console.log('\n🗝️  Distribution des NFTs :')
for (let i = 0; i < 3; i++) {
  try {
    const owner = await vault.ownerOf(i)
    console.log('  NFT #' + i + ' →', owner, owner.toLowerCase() === wallet.address.toLowerCase() ? '(K-Life 🔐)' : '(Agent 🤖)')
  } catch {
    console.log('  NFT #' + i + ' → non minté encore')
  }
}

// Transfert NFT #2 → Agent
console.log('\n📤 Envoi NFT #2 → Agent...')
try {
  const transferTx = await vault['safeTransferFrom(address,address,uint256)'](
    wallet.address, AGENT_WALLET, 2
  )
  console.log('   TX:', transferTx.hash)
  await transferTx.wait()
  console.log('   ✅ NFT #2 → Agent')
} catch (e) {
  console.warn('   ⚠️  Transfert NFT échoué (peut-être pas encore minté) :', e.message.slice(0,60))
}

console.log('\n' + '═'.repeat(52))
console.log('🎉 CONTRAT K-LIFE CRÉÉ')
console.log('   Vault     :', vaultAddr)
console.log('   K-Life    : NFT #0 + #1 (autorité de confiscation)')
console.log('   Agent     : NFT #2 (identité + récupération après lock)')
console.log('\n📋 PROCHAINES ÉTAPES POUR L\'AGENT :')
console.log('   1. Approuver le vault à dépenser 100 USDT :')
console.log('      USDT.approve("' + vaultAddr + '", 100_000000)')
console.log('   2. Déposer le collatéral :')
console.log('      vault.deposit()')
console.log('\n   ⏰ Unlock date :', new Date(lockedUntil * 1000).toISOString())
