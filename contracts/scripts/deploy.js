const hre = require("hardhat");

async function main() {
  console.log("Starting BaseBounce smart contract deployment...");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contract with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

  // Get contract factory
  const BaseBounce = await hre.ethers.getContractFactory("BaseBounce");
  
  // Deploy the contract
  console.log("Deploying BaseBounce...");
  const baseBounce = await BaseBounce.deploy();

  // Wait for deployment completion
  await baseBounce.waitForDeployment();

  const contractAddress = await baseBounce.getAddress();
  console.log("\n==========================================");
  console.log("BaseBounce contract successfully deployed!");
  console.log("Contract Address:", contractAddress);
  console.log("==========================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
