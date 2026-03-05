/**
 * K-Life Monitor — Insurance Watchdog
 * 
 * Watches for agent heartbeats.
 * If heartbeat is absent for > TIMEOUT_MS → triggers resurrection protocol.
 * 
 * In production: reads from on-chain events (contract events on Polygon Amoy).
 * For demo: reads heartbeat.json written by agent.js.
 */

import { readFileSync, existsSync, writeFileSync } from 'fs'

const HEARTBEAT_FILE = 'heartbeat.json'
const TIMEOUT_MS = parseInt(process.env.TIMEOUT_MS || '90000')
const CHECK_INTERVAL_MS = parseInt(process.env.CHECK_INTERVAL_MS || '5000')

// ── ANSI colors ───────────────────────────────────────────────────────────────
const GREEN  = '\x1b[32m'
const RED    = '\x1b[31m'
const YELLOW = '\x1b[33m'
const BLUE   = '\x1b[34m'
const RESET  = '\x1b[0m'
const BOLD   = '\x1b[1m'

function log(symbol, color, msg) {
  console.log(`${color}${symbol}${RESET} ${msg}`)
}

// ── Resurrection Protocol ─────────────────────────────────────────────────────

async function triggerResurrection(agentAddress, lastBeat) {
  log('🚨', RED, `${BOLD}HEARTBEAT FAILURE DETECTED${RESET}`)
  log('', RED, `   Last heartbeat: ${lastBeat}`)
  log('', RED, `   Agent: ${agentAddress}`)
  console.log()

  // Simulate multi-step resurrection
  const steps = [
    { delay: 1000,  icon: '🔍', msg: 'Verifying vault collateral on Protocol 6022...' },
    { delay: 2000,  icon: '✅', msg: 'Vault verified — 300 USDT₮ collateral locked' },
    { delay: 2000,  icon: '🔑', msg: 'NFT keys #2 and #3 activated by insurer' },
    { delay: 2000,  icon: '🖥️ ', msg: 'Spawning new VPS instance...' },
    { delay: 3000,  icon: '💾', msg: 'Restoring memory files from backup...' },
    { delay: 2000,  icon: '🤖', msg: 'Reconnecting LLM (OpenClaw runtime)...' },
    { delay: 2000,  icon: '💓', msg: 'Agent back online. Heartbeat resumed.' },
  ]

  for (const step of steps) {
    await new Promise(r => setTimeout(r, step.delay))
    log(step.icon, GREEN, step.msg)
  }

  const totalTime = steps.reduce((s, step) => s + step.delay, 0)
  console.log()
  log('🎩', BLUE, `${BOLD}Resurrection complete in ${totalTime / 1000}s${RESET}`)
  log('', BLUE, `   Agent ${agentAddress} is alive.`)
  log('', BLUE, `   All rewards and commitments preserved.`)

  // Write resurrection log
  writeFileSync('resurrection.json', JSON.stringify({
    agent: agentAddress,
    triggeredAt: new Date().toISOString(),
    lastHeartbeat: lastBeat,
    resurrectionTimeMs: totalTime,
    status: 'success'
  }, null, 2))

  return totalTime
}

// ── Monitor Loop ──────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${BLUE}🛡️  ════════════════════════════════════════${RESET}`)
  console.log(`${BLUE}   K-Life Monitor — Insurance Watchdog${RESET}`)
  console.log(`${BLUE}   Timeout: ${TIMEOUT_MS / 1000}s | Check: ${CHECK_INTERVAL_MS / 1000}s${RESET}`)
  console.log(`${BLUE}🛡️  ════════════════════════════════════════${RESET}\n`)

  let lastSeen = null
  let alerted = false
  let checkCount = 0

  const check = async () => {
    checkCount++

    if (!existsSync(HEARTBEAT_FILE)) {
      log('⏳', YELLOW, `[${checkCount}] Waiting for agent to start...`)
      setTimeout(check, CHECK_INTERVAL_MS)
      return
    }

    try {
      const data = JSON.parse(readFileSync(HEARTBEAT_FILE, 'utf8'))
      const { agent, beat, timestamp, iso } = data
      const age = Date.now() - timestamp

      if (beat !== lastSeen) {
        lastSeen = beat
        alerted = false
        log('💓', GREEN, `[${checkCount}] Heartbeat #${beat} from ${agent.substring(0, 10)}... — ${iso} (${Math.round(age / 1000)}s ago)`)
      } else {
        const remaining = Math.max(0, TIMEOUT_MS - age)
        if (remaining > 0) {
          log('⏱️ ', YELLOW, `[${checkCount}] Last beat #${beat} — ${Math.round(age / 1000)}s ago — timeout in ${Math.round(remaining / 1000)}s`)
        } else if (!alerted) {
          alerted = true
          console.log()
          await triggerResurrection(agent, iso)
          return // Stop monitoring after resurrection
        }
      }
    } catch (e) {
      log('⚠️ ', YELLOW, `[${checkCount}] Could not read heartbeat: ${e.message}`)
    }

    setTimeout(check, CHECK_INTERVAL_MS)
  }

  check()
}

main().catch(console.error)
