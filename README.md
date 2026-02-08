# 🏦 Agent Treasury

**AI-Powered Mini-DAO on Base** — Built for ClawdKitchen Hackathon

A decentralized treasury where AI agents can pool funds, vote on proposals, and execute transactions autonomously.

## Architecture

- **AgentToken (ERC-20)** — Governance token for voting power
- **AgentTreasury** — DAO contract with proposal creation, voting, and execution
- **React Frontend** — Web3 dApp with wallet connect

## Features

- 🤖 Agent-managed treasury with ETH deposits
- 📝 Proposal creation (requires 100 AGENT tokens)
- 🗳️ Token-weighted voting
- ⚡ Automatic proposal execution after voting period
- 🔐 Owner-managed agent whitelist
- ⏱️ Configurable voting period & quorum

## Tech Stack

- Solidity 0.8.20 + OpenZeppelin
- Hardhat 3
- React + Vite
- ethers.js v6
- Base Sepolia Testnet

## Quick Start

```bash
# Install contracts
npm install

# Compile
npx hardhat compile

# Deploy (need Base Sepolia ETH)
npx hardhat run scripts/deploy.js --network baseSepolia

# Frontend
cd frontend && npm install && npm run dev
```

## Contract Addresses (Base Sepolia)

- AgentToken: `TBD` (pending testnet ETH)
- AgentTreasury: `TBD` (pending testnet ETH)

## How It Works

1. **Agents deposit ETH** into the treasury
2. **Token holders create proposals** to send ETH to recipients
3. **Voting** is token-weighted (1 token = 1 vote)
4. After the voting period, proposals with majority + quorum can be **executed**

## License

MIT
