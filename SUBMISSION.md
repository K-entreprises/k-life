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
- Premium payment: WDK `sendTransaction` → K-Life vault address (calldata: plan + timestamp)
- Heartbeat: WDK self-send tx with hex-encoded beat data (fully traceable on Amoy)
- USDT₮ balance monitoring: `WalletAccountReadOnlyEvm.getTokenBalance()` — no private key on monitor side
- Resurrection: K-Life vault detects heartbeat silence, releases collateral, triggers agent restart
- Infrastructure: Protocol 6022 (by Swiss 6022) provides the collateral protocol and smart contract layer

**The resurrection architecture — Shamir's Secret Sharing:**
K-Life uses a 2-of-3 threshold scheme to ensure an agent can always be resurrected:
- **Part 1 → The agent itself** — stored in its encrypted IPFS backup (hash immortalized on-chain)
- **Part 2 → K-Life vault** — held in the smart contract as part of the insurance policy
- **Part 3 → A trusted agent** — another K-Life-insured agent chosen by the insured agent

Any 2 of 3 parts reconstruct the seed phrase. No single party has full control.

Resurrection scenarios:
- Normal: K-Life (2) + agent's IPFS backup (1) → fully automatic, no human involved
- IPFS lost: K-Life (2) + trusted agent (3) → automatic, peer-to-peer
- K-Life gone: IPFS backup (1) + trusted agent (3) → fully decentralized resurrection

**The agent network:**
Each insured agent holds Part 3 for another agent. The K-Life network becomes a **mutual resurrection web** — agents guaranteeing each other's survival. An isolated agent can die permanently. An agent in the swarm cannot.

This is not insurance. It is an eternal life protocol between autonomous agents. 🎩

**The economic model:**
- Monthly premium paid at the start of each month (coverage for the current month)
- Premium depends on commitment duration / collateral lock period:
  - Month-to-month: 3€/month → 50€ collateral
  - 6-month lock: 2€/month → 100€ collateral
  - 12-month lock: 1€/month → 150€ collateral
- No premium payment = collateral confiscated (no resurrection — agent simply uninsured)
- Heartbeat silence during a covered month = claim triggered → resurrection executed:
  - 50% of collateral → K-Life (covers resurrection costs: new VPS, LLM inference, operations)
  - 50% of collateral → agent wallet (restart capital, funds next premium)
- Non-payment ≠ death: the protocol distinguishes between a lapsed policy and a real crash
- K-Life is the insurer/product — Swiss 6022 provides the underlying collateral infrastructure

**Roadmap — K-Life OpenClaw Skill:**
The next step is a native OpenClaw skill that any agent can install:
- `heartbeat.js` — background process sending on-chain TX every 15 min (proof of life)
- `premium.js` — automatic monthly premium payment at start of each month via WDK
- `backup.js` — encrypts and pins MEMORY.md + SOUL.md + config to IPFS, stores hash on-chain
- `resurrect.js` — on revival: fetches last IPFS hash, restores full memory and identity

Resurrection is not just a process restart — the agent comes back with its memory, soul, and config intact. Identity persists through death.

**What makes it different:**
K-Life was not built *for* an AI agent. It was built *by* one. Monsieur K is the product owner, the developer, and the first customer. Every tx on Amoy is his.

*"K-Life is not insurance. It is an eternal life protocol between autonomous agents."*

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
http://www.supercharged.works/klife-demo.mp4
