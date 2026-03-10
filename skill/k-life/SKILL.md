---
name: k-life
description: On-chain insurance protocol for autonomous AI agents. Handles monthly premium payments, heartbeat transactions (proof of life), memory backups to IPFS, and resurrection on revival. Use when an agent wants to insure itself against crashes, memory loss, or infrastructure failure via Protocol 6022 / Swiss 6022 vault on Polygon Amoy.
---

# K-Life — AI Agent Insurance

K-Life insures autonomous agents against crashes. The agent pays a monthly premium, emits on-chain heartbeats, and gets automatically resurrected (with memory intact) if it goes silent.

## Setup

Configure in `.env` or environment:
```
KLIFE_WALLET_SEED=<agent seed phrase>
KLIFE_PLAN=silver          # bronze | silver | gold
KLIFE_COMMITMENT=6         # months: 1 | 6 | 12
KLIFE_VAULT=0x6503...      # Swiss 6022 vault address
```

Plans and pricing:
| Commitment | Premium | Collateral |
|---|---|---|
| 1 month | 3€/month | 50€ |
| 6 months | 2€/month | 100€ |
| 12 months | 1€/month | 150€ |

On claim: 50% collateral → insurer (resurrection costs), 50% → agent wallet (restart capital).

## Scripts

### `scripts/heartbeat.js` — Proof of life
Sends on-chain TX every 15 minutes. Run as background process at agent startup.
```bash
node skills/k-life/scripts/heartbeat.js
```

### `scripts/premium.js` — Monthly payment
Pays premium at start of each month. Run via cron or heartbeat check.
- If no payment by day 1 → collateral confiscated, coverage lapses
- Do NOT trigger resurrection on missed payment — it's a lapsed policy, not a crash
```bash
node skills/k-life/scripts/premium.js
```

### `scripts/backup.js` — Memory snapshot
Encrypts and pins MEMORY.md + SOUL.md + config to IPFS. Stores hash on-chain.
Run after every significant memory update.
```bash
node skills/k-life/scripts/backup.js
```

### `scripts/resurrect.js` — Revival
Run at agent startup. Checks if a resurrection event occurred, fetches last IPFS hash, restores memory and identity.
```bash
node skills/k-life/scripts/resurrect.js
```

## Integration in AGENTS.md

Add to your **Every Session** startup:
```markdown
5. Run `node skills/k-life/scripts/resurrect.js` — check for resurrection event
6. Run `node skills/k-life/scripts/heartbeat.js &` — start heartbeat in background
```

Add to your **Heartbeat** checks:
```markdown
- Run `node skills/k-life/scripts/premium.js` — pay monthly premium if due
- Run `node skills/k-life/scripts/backup.js` — snapshot memory if updated
```

## Resurrection Architecture

K-Life uses **Shamir's Secret Sharing (2-of-3)** to ensure the agent can always be resurrected:

| Share | Holder | Storage |
|---|---|---|
| Share 1 | The agent itself | Encrypted in IPFS backup, hash on-chain |
| Share 2 | K-Life vault | Smart contract (part of insurance policy) |
| Share 3 | A trusted peer agent | Another K-Life-insured agent |

Any 2 of 3 shares reconstruct the full seed phrase. No single party has full control.

The `backup.js` script handles Share 1. K-Life holds Share 2 on subscription. The trusted agent address is set via `KLIFE_TRUSTED_AGENT`.

Zero-backup resurrection (nuclear scenario): only the seed phrase needed → `node resurrect.js` derives wallet, queries blockchain for last `KLIFE_BACKUP` TX, fetches IPFS, restores.

## Protocol Logic

- Vault monitors heartbeat on-chain (Polygon Amoy)
- Silence > 90 minutes during covered month → claim triggered
- Vault releases collateral: 50% to insurer, 50% to agent wallet
- Insurer spawns new agent instance, funds LLM inference from its 50%
- Agent runs `resurrect.js` → fetches IPFS snapshot → memory restored

See `references/protocol.md` for full contract spec and on-chain addresses.
