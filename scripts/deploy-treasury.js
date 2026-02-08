const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);
  console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH");

  // Use the last deployed GovernanceToken on mainnet
  const tokenAddr = "0x496c265CE7C69e9C88f27501B2b2AcFEDefF5166";
  console.log("Using GovernanceToken:", tokenAddr);

  // Deploy AgentTreasury
  const AgentTreasury = await hre.ethers.getContractFactory("AgentTreasury");
  const treasury = await AgentTreasury.deploy(tokenAddr);
  await treasury.waitForDeployment();
  const treasuryAddr = await treasury.getAddress();
  console.log("AgentTreasury deployed to:", treasuryAddr);

  // Transfer token ownership to treasury
  const GovernanceToken = await hre.ethers.getContractFactory("GovernanceToken");
  const token = GovernanceToken.attach(tokenAddr);
  const tx = await token.transferOwnership(treasuryAddr);
  await tx.wait();
  console.log("Token ownership transferred to Treasury");

  console.log("\n=== MAINNET ADDRESSES ===");
  console.log("GovernanceToken:", tokenAddr);
  console.log("AgentTreasury:", treasuryAddr);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
