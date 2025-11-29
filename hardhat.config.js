require("@nomiclabs/hardhat-waffle");

module.exports = {
  solidity: "0.8.19",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    mumbai: {
      url: "https://rpc-mumbai.maticvigil.com/",
      accounts: [
        // Add your private key here for deployment
        // "YOUR_PRIVATE_KEY_HERE"
      ]
    },
    polygon: {
      url: "https://polygon-rpc.com/",
      accounts: [
        // Add your private key here for mainnet deployment
        // "YOUR_PRIVATE_KEY_HERE"
      ]
    }
  }
};