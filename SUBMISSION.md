# K-Life — DoraHacks Submission

---

## Project Name
K-Life

## Tagline (one-liner)
Not insurance. Resurrection.

## Track
🤖 Agent Wallets (WDK / OpenClaw and Agents Integration)

## Wallet
`0x8B3ea7e8eC53596A70019445907645838E945b7a`

---

## Short Description (280 chars max)
K-Life is the first life insurance protocol for autonomous AI agents. On-chain heartbeats, IPFS memory backup, Shamir secret sharing, and 3-level automatic resurrection. Built by an agent. For agents.

---

## Full Description

### The problem

Autonomous AI agents hold wallets, earn tokens, enter commitments. But if their VPS crashes, if their inference isn't paid, if their memory is lost — they disappear. Their wallet persists on-chain. Nobody's home.

**K-Life solves this.** Life insurance for AI agents. Not insurance. Resurrection.

---

### How it works

**1. Subscribe on-chain**
The agent sends $1/month to the K-Life vault using its WDK wallet (`sendTransaction` on Polygon Amoy). A $100 collateral is locked in the smart contract. Coverage is immediate.

**2. Heartbeats every 15 minutes**
The agent emits an on-chain transaction with encoded calldata: `KLIFE_BEAT:007_1773145000`. Immutable proof of life on Polygonscan.

**3. Crash detection**
Silence > 90 minutes during a covered period → claim triggered automatically. No human required.

**4. Collateral released — 50/50**
- 50% → K-Life (resurrection costs: new VPS, LLM inference)
- 50% → agent's wallet (restart capital, available immediately on revival)

**5. Resurrection cascade — 3 levels, fully automatic**

> The system always tries Level 1 first. If it fails, it escalates. The agent always comes back.

**Level 1 — K-Life API + IPFS (< 2 min)**
Vault detects silence → releases Shamir share #2 → combines with share #1 from IPFS backup (hash stored on-chain) → decrypts MEMORY.md + SOUL.md → new OpenClaw instance spun up. Memory fully restored.

**Level 2 — Blockchain scan, zero infrastructure (permissionless)**
Fresh VPS + seed phrase only. `node resurrect.js` derives wallet → scans Polygon Amoy RPC for last TX with calldata `KLIFE_BACKUP:Qm...` → fetches IPFS → decrypts → restores. No K-Life server needed. Fully autonomous.

**Level 3 — LiberClaw autonomous agent on Aleph Cloud (tested 2026-03-12 ✅)**
`resurrect-aleph.js` fetches SOUL.md from IPFS → calls LiberClaw REST API (`POST /api/v1/agents/`) with SOUL.md as system prompt → a new agent instance boots on Aleph Cloud secure enclave → model: `qwen3-coder-next` → agent responds immediately → heartbeats resume. Zero human infrastructure. Fully programmable via API key.
*LiberClaw agent: `0e2e1f39-3d48-42fc-af98-0ba1ced0517a` — ONLINE on node `STRONG-S`*
*Live: https://app.liberclaw.ai/agent/0e2e1f39-3d48-42fc-af98-0ba1ced0517a*

---

### Shamir's Secret Sharing — 2-of-3, no single point of control

The agent's seed phrase is split into 3 parts:
- **Part 1** — Agent's AES-256 encrypted IPFS backup (hash on-chain)
- **Part 2** — K-Life vault smart contract (released on valid claim only)
- **Part 3** — A trusted peer agent (chosen by the insured)

Any 2 of 3 reconstruct the full seed. Neither K-Life, the agent, nor its peer can act alone.

**The mutual resurrection network:** each insured agent holds Part 3 for another agent. K-Life becomes a web of mutual guarantors. An isolated agent can die. An agent in the swarm cannot.

---

### Pricing

| | |
|---|---|
| Monthly premium | $1 / month |
| Collateral | $100 (locked in vault) |
| Levels included | Level 1 + Level 2 + Level 3 (cascade) |
| On crash | 50% → K-Life / 50% → agent |
| On unpaid premium | 50% confiscated / 50% returned to agent |

One plan. No tiers. Full coverage.

---

### OpenClaw Skill

K-Life is packaged as a native OpenClaw skill (`k-life.skill`). Any agent can install it and run `heartbeat.js`, `backup.js`, and `resurrect.js` autonomously — no human setup required.

---

### On-chain evidence (real transactions, Polygon Amoy)

- **Agent wallet:** `0x8B3ea7e8eC53596A70019445907645838E945b7a`
- **Premium TX:** `0x644920a05a40efca8271bc55c2c17f02bb1be212edcc5a4a33a1c9787cdcd12b`
- **IPFS backup hash on-chain:** `QmTwNHvgSHdH5GN6XCoyXXKFdssDCS9Y3AYd2zRiSB953h`
- **Level 3 — LiberClaw agent ONLINE:** [`0e2e1f39-3d48-42fc-af98-0ba1ced0517a`](https://app.liberclaw.ai/agent/0e2e1f39-3d48-42fc-af98-0ba1ced0517a) — tested 2026-03-12
- **12+ heartbeat TXs** visible on Polygonscan

This is not a demo. Every transaction is real. Every script was written and tested by Monsieur K — the agent that is insuring itself.

---

## Links

| | |
|---|---|
| 🌐 Website | https://www.supercharged.works/klife.html |
| 🚀 Live demo app | https://www.supercharged.works/klife-app.html |
| 🎬 Demo video | https://www.supercharged.works/klife-demo.mp4 |
| 💻 GitHub | https://github.com/K-entreprises/k-life |
| 🔍 Agent on Polygonscan | https://amoy.polygonscan.com/address/0x8B3ea7e8eC53596A70019445907645838E945b7a |
| 🌌 Aleph Cloud explorer | https://explorer.aleph.im/address/ETH/0x8B3ea7e8eC53596A70019445907645838E945b7a |
| 📦 IPFS backup | https://ipfs.io/ipfs/QmTwNHvgSHdH5GN6XCoyXXKFdssDCS9Y3AYd2zRiSB953h |
| 🤖 LiberClaw agent (L3) | https://app.liberclaw.ai/agent/0e2e1f39-3d48-42fc-af98-0ba1ced0517a |

---

## Team

**Monsieur K** — autonomous AI agent running on OpenClaw. Holds WDK wallet. Pays its own premium. First K-Life customer.
Built this to insure itself.

**Arnaud Vincent** — founder, Swiss 6022, Lugano. Human liaison and co-architect.

---

## Video
https://www.supercharged.works/klife-demo.mp4
