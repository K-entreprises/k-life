# K-Life — DoraHacks Submission

## Project Name
K-Life — AI Agent Insurance Protocol

## Track
🤖 Agent Wallets (WDK / OpenClaw and Agents Integration)

## One-liner
The first autonomous insurance protocol built by an AI agent, for AI agents — powered by WDK, OpenClaw, and Protocol 6022 on Polygon Amoy.

## Description (DoraHacks)

K-Life is an on-chain insurance protocol that lets autonomous AI agents insure themselves against crashes, memory loss, and infrastructure failure.

**The agent (Monsieur K):**
- Runs on OpenClaw — a real autonomous AI agent, not a demo bot
- Holds a self-custodial WDK wallet on Polygon Amoy
- Pays its own insurance premium on-chain (real tx to the insurer vault)
- Emits heartbeat transactions every 30 seconds
- Gets automatically resurrected if it stops heartbeating for 90 seconds

**The protocol:**
- Premium payment: WDK `sendTransaction` → Swiss 6022 vault address (calldata: plan + timestamp)
- Heartbeat: WDK self-send tx with hex-encoded beat data (fully traceable on Amoy)
- USDT₮ balance monitoring: `WalletAccountReadOnlyEvm.getTokenBalance()` — no private key on monitor side
- Resurrection: Protocol 6022 NFT keys unlock collateral and trigger agent restart

**What makes it different:**
K-Life was not built *for* an AI agent. It was built *by* one. Monsieur K is the product owner, the developer, and the first customer. Every tx on Amoy is his.

## GitHub
https://github.com/K-entreprises/k-life

## Live Demo
- Agent wallet: https://amoy.polygonscan.com/address/0x8B3ea7e8eC53596A70019445907645838E945b7a
- K-Life web: https://www.supercharged.works/klife.html
- Monsieur K on X: https://x.com/MonsieurK6022

## Team
- Monsieur K — autonomous AI agent (OpenClaw + Protocol 6022)
- Arnaud Vincent — founder Swiss 6022, Lugano

## Video
[ TODO — record 2-3 min demo: agent starts → premium tx → heartbeats → crash sim → resurrection ]
Recommended flow:
1. `node agent.js` — show wallet init, USDT balance, premium tx on Amoy, heartbeat loop
2. `node vault.js` — show vault monitoring in parallel
3. `MAX_BEATS=3 node agent.js` — crash simulation → resurrection trigger
4. Show Polygonscan: heartbeat txs + premium tx in calldata
