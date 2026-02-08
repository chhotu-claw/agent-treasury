const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);
  console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH");

  const Token = await hre.ethers.getContractFactory("AgentToken");
  const token = await Token.deploy();
  await token.waitForDeployment();
  const tokenAddr = await token.getAddress();
  console.log("AgentToken deployed to:", tokenAddr);

  const Treasury = await hre.ethers.getContractFactory("AgentTreasury");
  const treasury = await Treasury.deploy(tokenAddr);
  await treasury.waitForDeployment();
  const treasuryAddr = await treasury.getAddress();
  console.log("AgentTreasury deployed to:", treasuryAddr);

  await treasury.setVotingPeriod(300);
  console.log("Voting period set to 5 minutes");

  await treasury.setQuorum(hre.ethers.parseEther("100"));
  console.log("Quorum set to 100 tokens");

  console.log("\n--- DEPLOYMENT SUMMARY ---");
  console.log("AgentToken:", tokenAddr);
  console.log("AgentTreasury:", treasuryAddr);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
