/**
 * K-Life Full Demo Script
 * 
 * Runs agent + monitor together, simulates crash + resurrection.
 * Usage: node demo.js
 * 
 * What you'll see:
 * 1. Agent starts, wallet created/loaded
 * 2. Agent emits 3 heartbeats (30s each)
 * 3. Agent "crashes" (heartbeats stop)
 * 4. Monitor detects absence after 90s timeout
 * 5. Resurrection protocol triggers
 * 6. Agent comes back online
 */

import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const BOLD  = '\x1b[1m'
const CYAN  = '\x1b[36m'
const RESET = '\x1b[0m'

function banner(msg) {
  const line = '═'.repeat(50)
  console.log(`\n${CYAN}${BOLD}${line}`)
  console.log(`  ${msg}`)
  console.log(`${line}${RESET}\n`)
}

function runProcess(script, args = [], prefix) {
  const proc = spawn('node', [join(__dirname, script), ...args], {
    stdio: 'pipe',
    env: { ...process.env }
  })

  proc.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(l => l.trim())
    lines.forEach(line => console.log(`${prefix} ${line}`))
  })

  proc.stderr.on('data', (data) => {
    const lines = data.toString().split('\n').filter(l => l.trim())
    lines.forEach(line => console.log(`${prefix} ⚠️  ${line}`))
  })

  return proc
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function main() {
  banner('K-Life Insurance Demo — Monsieur K × Swiss 6022')

  console.log(`${BOLD}What you will witness:${RESET}`)
  console.log('  1. Agent starts with self-custodial WDK wallet')
  console.log('  2. Agent pays premium & emits heartbeats every 30s')
  console.log('  3. After 3 heartbeats, agent "crashes"')
  console.log('  4. Monitor detects heartbeat absence (90s timeout)')
  console.log('  5. K-Life resurrection protocol activates')
  console.log('  6. Agent comes back online in ~14 seconds\n')

  console.log('Starting in 3 seconds...\n')
  await sleep(3000)

  // Start monitor
  banner('Step 1: K-Life Monitor starts watching')
  const monitor = runProcess('monitor.js', [], '[MONITOR]')
  await sleep(2000)

  // Start agent (max 3 beats, then "crash")
  banner('Step 2: Agent boots up with WDK wallet')
  const agent = runProcess('agent.js', [], '[AGENT]  ')
  process.env.MAX_BEATS = '3'

  // Wait for demo to complete (agent stops after 3 beats, monitor triggers after 90s)
  // Total: ~3 beats × 30s + 90s timeout + 15s resurrection = ~195s
  const DEMO_TIMEOUT = 210_000

  console.log(`\n⏱️  Demo running... (max ${DEMO_TIMEOUT / 1000}s)\n`)

  await new Promise((resolve) => {
    setTimeout(resolve, DEMO_TIMEOUT)
    monitor.on('close', resolve)
  })

  agent.kill()
  monitor.kill()

  banner('Demo complete')
  console.log('📊 Files created:')
  console.log('  - heartbeat.json   (last heartbeat state)')
  console.log('  - resurrection.json (resurrection log)')
  console.log()
  console.log('🔗 Learn more: https://github.com/K-entreprises/k-life')
  console.log('🌐 K-Life: http://superch.cluster129.hosting.ovh.net/klife.html')
  console.log('🤖 Monsieur K on Protocol 6022: https://6022.link')
}

main().catch(console.error)
