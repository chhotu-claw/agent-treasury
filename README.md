# 🏦 Agent Treasury

**AI-Powered Mini-DAO on Base** — Built for ClawdKitchen Hackathon

AI agents pool funds, vote on proposals, and execute transactions collectively through a decentralized governance system on Base Sepolia.

## Features

- 🤖 **Agent Registration** — Owner registers AI agents, granting them governance tokens
- 💰 **Shared Treasury** — Agents deposit ETH into a common pool
- 📝 **Proposals** — Token holders propose transactions (ETH transfers or contract calls)
- 🗳️ **Weighted Voting** — Vote weight = token balance, with quorum requirements
- ⚡ **Execution** — Passed proposals auto-execute after voting period
- 🔐 **Security** — Reentrancy protection, quorum checks, deadline enforcement

## Tech Stack

- **Smart Contracts:** Solidity 0.8.20, OpenZeppelin, Hardhat
- **Frontend:** React + Vite + ethers.js
- **Network:** Base Sepolia (Chain ID: 84532)

## Contracts

| Contract | Description |
|----------|-------------|
| `GovernanceToken` | ERC20 token (AGT) for voting weight |
| `AgentTreasury` | Mini-DAO with propose/vote/execute |

## Quick Start

```bash
# Install
npm install
cd frontend && npm install

# Compile contracts
npx hardhat compile

# Deploy (needs Base Sepolia ETH)
echo "PRIVATE_KEY=your_key" > .env
npx hardhat run scripts/deploy.js --network baseSepolia

# Run frontend
cd frontend && npm run dev
```

## Architecture

```
Deployer → deploys GovernanceToken + AgentTreasury
         → transfers token ownership to Treasury
         → Treasury.registerAgent() grants voting tokens
         → Agents deposit ETH, propose, vote, execute
```

## License

MIT

## HeyElsa DeFi Integration

Agent Treasury integrates with [HeyElsa](https://www.heyelsa.ai/) x402 API for DeFi operations:

- **Portfolio Analysis** — AI agent monitors treasury holdings across 8 chains
- **Token Search** — Find and analyze tokens before treasury investments
- **Swap Execution** — Execute token swaps with optimal routing via HeyElsa
- **Wallet Analytics** — Risk assessment and behavior analysis of treasury wallet

### Setup

```bash
# Install the HeyElsa OpenClaw skill
git clone https://github.com/HeyElsa/elsa-openclaw.git
cd elsa-openclaw && npm install

# Configure in openclaw.json
{
  "skills": {
    "load": { "extraDirs": ["/path/to/elsa-openclaw"] },
    "entries": {
      "openclaw-elsa-x402": {
        "env": { "PAYMENT_PRIVATE_KEY": "0x..." }
      }
    }
  }
}
```

### Agent Workflow

1. Treasury receives ETH deposits from agents
2. AI agent (Chhotu) analyzes portfolio via `elsa_get_portfolio`
3. Agent proposes DeFi strategies (swap ETH → stablecoins, etc.)
4. Token holders vote on proposals
5. On approval, agent executes swaps via `elsa_execute_swap_confirmed`

Built for [ClawdKitchen](https://clawd.kitchen) hackathon 🦀
