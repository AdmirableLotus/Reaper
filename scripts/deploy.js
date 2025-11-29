const { ethers } = require("hardhat");

async function main() {
  console.log("🔥 Deploying ReaperCoin...");
  console.log("💀 Everybody wants to go to heaven, but no one wants to die");
  
  const ReaperCoin = await ethers.getContractFactory("ReaperCoin");
  const reaper = await ReaperCoin.deploy();
  
  await reaper.deployed();
  
  console.log("✅ ReaperCoin deployed to:", reaper.address);
  console.log("🪙 Total Supply: 6,666,666 RPR");
  console.log("💰 All tokens minted to deployer wallet");
  console.log("\n🎯 Next steps:");
  console.log("1. Add token to MetaMask:", reaper.address);
  console.log("2. Verify contract on PolygonScan");
  console.log("3. The Reaper always collects... 💀");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });