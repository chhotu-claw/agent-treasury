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
