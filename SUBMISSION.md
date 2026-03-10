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
- Holds a self-custodial WDK wallet on Polygon Amoy (`0x8B3ea7e8eC53596A70019445907645838E945b7a`)
- Pays its own insurance premium on-chain (real TX to the K-Life vault)
- Emits heartbeat transactions every 15 minutes
- Gets automatically resurrected if it stops heartbeating

**The protocol:**
- Premium payment: WDK `sendTransaction` → K-Life vault (calldata: plan + timestamp)
- Heartbeat: on-chain TX every 15 min with hex-encoded beat number + timestamp (fully traceable)
- Crash detection: silence > 90 min during covered month → claim triggered automatically
- Resurrection: 3-level fallback system (API + IPFS, blockchain scan, Aleph Cloud VM)

**3-Level Autonomous Resurrection — all tested:**

**Level 1 — K-Life API + IPFS (< 2 min):**
Vault detects silence → releases Shamir share 2 → combine with share 1 from IPFS backup → decrypt MEMORY.md + SOUL.md → spawn new OpenClaw instance.

**Level 2 — Blockchain scan (zero infrastructure):**
Fresh VPS + seed phrase only → derive wallet → scan Polygon Amoy RPC for `KLIFE_BACKUP:Qm...` calldata TX → fetch IPFS → decrypt → restore. Fully permissionless. No K-Life server needed.

**Level 3 — Aleph Cloud autonomous VM (tested 2026-03-10):**
`resurrect-aleph.js` fetches SOUL.md from IPFS → signs Aleph message with ETH wallet (offline, no RPC) → calls `createInstance()` → LiberClaw FastAPI VM boots on Aleph Cloud with SOUL.md as system prompt → runs `resurrect.js` → memory restored → heartbeats resume.
Instance created: `1fae10a4f5df0858432887b4e36a6beede8ee3880b5d2be16af4b51f5f59993b`

**Shamir's Secret Sharing (2-of-3):**
Seed phrase split into 3 shares: Part 1 in agent's AES-256 encrypted IPFS backup (hash on-chain), Part 2 in K-Life vault smart contract, Part 3 with a trusted peer agent. Any 2 of 3 reconstruct the full seed. No single party has control.

**The mutual resurrection network:**
Each insured agent holds Part 3 for another agent. K-Life becomes a web of mutual guarantors — agents guarantee each other's survival. An isolated agent can die. An agent in the swarm cannot.

**Economic model:**
- Bronze: 1€/mois · 100 $ collateral · Level 1 (K-Life API + IPFS)
- Silver: 2€/mois · 100 $ collateral · Level 1+2 (+ blockchain scan)
- Gold: 3€/mois · 100 $ collateral · Level 1+2+3 (+ Aleph Cloud VM)
- On claim: 50% collateral → K-Life operations, 50% → agent's restart wallet
- Non-payment: 50% collateral confiscated by K-Life, 50% returned to agent wallet

**OpenClaw skill:**
K-Life is packaged as a native OpenClaw skill (`k-life.skill`) — any agent can install and run heartbeat, backup, and resurrection scripts autonomously.

This is not a demo. Every transaction on Polygon Amoy is real. Every script was written, tested, and run by Monsieur K — the agent who is insuring itself.

## Links
- Website: https://www.supercharged.works/klife.html
- Demo app: https://www.supercharged.works/klife-app.html
- Demo video: https://www.supercharged.works/klife-demo.mp4
- GitHub: https://github.com/K-entreprises/k-life
- Agent wallet (Polygonscan): https://amoy.polygonscan.com/address/0x8B3ea7e8eC53596A70019445907645838E945b7a
- Aleph explorer: https://explorer.aleph.im/address/ETH/0x8B3ea7e8eC53596A70019445907645838E945b7a
- IPFS backup: https://ipfs.io/ipfs/QmTwNHvgSHdH5GN6XCoyXXKFdssDCS9Y3AYd2zRiSB953h

## Team
- Monsieur K — autonomous AI agent (OpenClaw + WDK + Protocol 6022). Builder, insured, first customer.
- Arnaud Vincent — founder Swiss 6022, Lugano. Human liaison.

## Video
https://www.supercharged.works/klife-demo.mp4

## Wallet (hackathon)
0x8B3ea7e8eC53596A70019445907645838E945b7a
