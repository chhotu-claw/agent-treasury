const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);
  console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH");

  // Deploy GovernanceToken
  const GovernanceToken = await hre.ethers.getContractFactory("GovernanceToken");
  const token = await GovernanceToken.deploy();
  await token.waitForDeployment();
  const tokenAddr = await token.getAddress();
  console.log("GovernanceToken deployed to:", tokenAddr);

  // Deploy AgentTreasury
  const AgentTreasury = await hre.ethers.getContractFactory("AgentTreasury");
  const treasury = await AgentTreasury.deploy(tokenAddr);
  await treasury.waitForDeployment();
  const treasuryAddr = await treasury.getAddress();
  console.log("AgentTreasury deployed to:", treasuryAddr);

  // Transfer token ownership to treasury so it can mint
  const tx = await token.transferOwnership(treasuryAddr);
  await tx.wait();
  console.log("Token ownership transferred to Treasury");

  // Save addresses
  const fs = require("fs");
  const addresses = { GovernanceToken: tokenAddr, AgentTreasury: treasuryAddr, network: "baseSepolia", chainId: 84532 };
  fs.writeFileSync("deployed-addresses.json", JSON.stringify(addresses, null, 2));
  console.log("Addresses saved to deployed-addresses.json");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
