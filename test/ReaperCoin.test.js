// test/ReaperCoin.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ReaperCoin", function () {
    let reaper;
    let owner;
    let addr1;
    let addr2;
    let addr3;

    const TOTAL_SUPPLY = ethers.parseEther("666666666");
    const BURN_RATE = 100n; // 1%
    const BASIS_POINTS = 10000n;

    beforeEach(async function () {
        [owner, addr1, addr2, addr3] = await ethers.getSigners();
        const ReaperCoin = await ethers.getContractFactory("ReaperCoin");
        reaper = await ReaperCoin.deploy(owner.address);
        await reaper.waitForDeployment();
    });

    describe("Deployment", function () {
        it("Should set correct name and symbol", async function () {
            expect(await reaper.name()).to.equal("ReaperCoin");
            expect(await reaper.symbol()).to.equal("RPR");
        });

        it("Should mint total supply to owner", async function () {
            expect(await reaper.balanceOf(owner.address)).to.equal(TOTAL_SUPPLY);
        });

        it("Should set correct max transaction amount (1%)", async function () {
            const maxTx = await reaper.maxTransactionAmount();
            expect(maxTx).to.equal(TOTAL_SUPPLY / 100n);
        });

        it("Should set correct max wallet balance (2%)", async function () {
            const maxWallet = await reaper.maxWalletBalance();
            expect(maxWallet).to.equal((TOTAL_SUPPLY * 2n) / 100n);
        });

        it("Should not have trading enabled initially", async function () {
            expect(await reaper.tradingEnabled()).to.equal(false);
        });

        it("Should have anti-whale enabled by default", async function () {
            expect(await reaper.antiWhaleEnabled()).to.equal(true);
        });

        it("Should exclude owner from limits", async function () {
            expect(await reaper.isExcludedFromLimits(owner.address)).to.equal(true);
        });
    });

    describe("Trading Controls", function () {
        it("Should not allow non-excluded transfers before trading is enabled", async function () {
            await reaper.transfer(addr1.address, ethers.parseEther("1000"));
            await expect(
                reaper.connect(addr1).transfer(addr2.address, ethers.parseEther("100"))
            ).to.be.revertedWith("Trading not yet enabled");
        });

        it("Should allow owner to transfer before trading enabled", async function () {
            await expect(
                reaper.transfer(addr1.address, ethers.parseEther("1000"))
            ).to.not.be.reverted;
        });

        it("Should enable trading", async function () {
            await reaper.enableTrading();
            expect(await reaper.tradingEnabled()).to.equal(true);
        });

        it("Should not allow enabling trading twice", async function () {
            await reaper.enableTrading();
            await expect(reaper.enableTrading()).to.be.revertedWith("Trading already enabled");
        });

        it("Should emit TradingEnabled event", async function () {
            await expect(reaper.enableTrading())
                .to.emit(reaper, "TradingEnabled");
        });
    });

    describe("Anti-Whale", function () {
        beforeEach(async function () {
            await reaper.enableTrading();
            await reaper.transfer(addr1.address, ethers.parseEther("10000000"));
            await reaper.setExcludedFromLimits(addr1.address, true);
        });

        it("Should block transactions exceeding max transaction amount", async function () {
            await reaper.transfer(addr2.address, ethers.parseEther("5000000"));
            await reaper.setExcludedFromLimits(addr2.address, false);
            const maxTx = await reaper.maxTransactionAmount();
            const overMax = maxTx + ethers.parseEther("1");
            await expect(
                reaper.connect(addr2).transfer(addr3.address, overMax)
            ).to.be.revertedWith("Exceeds max transaction");
        });

        it("Should block transfers that exceed max wallet balance", async function () {
            const maxWallet = await reaper.maxWalletBalance();
            await expect(
                reaper.connect(addr1).transfer(addr2.address, maxWallet + 1n)
            ).to.be.revertedWith("Exceeds max wallet balance");
        });

        it("Should allow owner to update max transaction amount", async function () {
            const newMax = TOTAL_SUPPLY / 50n;
            await reaper.setMaxTransactionAmount(newMax);
            expect(await reaper.maxTransactionAmount()).to.equal(newMax);
        });

        it("Should not allow max transaction below 0.1%", async function () {
            const tooLow = TOTAL_SUPPLY / 1001n;
            await expect(
                reaper.setMaxTransactionAmount(tooLow)
            ).to.be.revertedWith("Cannot set below 0.1%");
        });

        it("Should allow toggling anti-whale", async function () {
            await reaper.setAntiWhaleEnabled(false);
            expect(await reaper.antiWhaleEnabled()).to.equal(false);
        });
    });

    describe("Burn Mechanism", function () {
        beforeEach(async function () {
            await reaper.enableTrading();
        });

        it("Should burn 1% on transfer", async function () {
            const transferAmount = ethers.parseEther("1000");
            const expectedBurn = (transferAmount * BURN_RATE) / BASIS_POINTS;
            const expectedReceived = transferAmount - expectedBurn;
            await reaper.transfer(addr1.address, transferAmount);
            expect(await reaper.balanceOf(addr1.address)).to.equal(expectedReceived);
            expect(await reaper.totalBurned()).to.equal(expectedBurn);
        });

        it("Should update total burned tracker", async function () {
            await reaper.transfer(addr1.address, ethers.parseEther("10000"));
            const burned = await reaper.totalBurned();
            expect(burned).to.be.gt(0n);
        });

        it("Should report circulating supply correctly", async function () {
            await reaper.transfer(addr1.address, ethers.parseEther("10000"));
            const burned = await reaper.totalBurned();
            const circulating = await reaper.circulatingSupply();
            expect(circulating).to.equal(TOTAL_SUPPLY - burned);
        });
    });

    describe("Blacklist", function () {
        beforeEach(async function () {
            await reaper.enableTrading();
            await reaper.transfer(addr1.address, ethers.parseEther("1000"));
        });

        it("Should blacklist an address", async function () {
            await reaper.setBlacklisted(addr1.address, true);
            expect(await reaper.isBlacklisted(addr1.address)).to.equal(true);
        });

        it("Should prevent blacklisted address from transferring", async function () {
            await reaper.setBlacklisted(addr1.address, true);
            await expect(
                reaper.connect(addr1).transfer(addr2.address, ethers.parseEther("100"))
            ).to.be.revertedWith("Address blacklisted");
        });

        it("Should prevent transfers to blacklisted address", async function () {
            await reaper.setBlacklisted(addr2.address, true);
            await expect(
                reaper.transfer(addr2.address, ethers.parseEther("100"))
            ).to.be.revertedWith("Address blacklisted");
        });

        it("Should not allow blacklisting owner", async function () {
            await expect(
                reaper.setBlacklisted(owner.address, true)
            ).to.be.revertedWith("Cannot blacklist owner");
        });
    });

    describe("Pause", function () {
        it("Should pause and unpause", async function () {
            await reaper.pause();
            expect(await reaper.paused()).to.equal(true);
            await reaper.unpause();
            expect(await reaper.paused()).to.equal(false);
        });

        it("Should prevent transfers when paused", async function () {
            await reaper.pause();
            await expect(
                reaper.transfer(addr1.address, ethers.parseEther("100"))
            ).to.be.reverted;
        });

        it("Should emit ReaperPaused event", async function () {
            await expect(reaper.pause())
                .to.emit(reaper, "ReaperPaused")
                .withArgs(owner.address);
        });
    });

    describe("Recovery", function () {
        it("Should not allow recovering RPR itself", async function () {
            await expect(
                reaper.recoverERC20(await reaper.getAddress(), ethers.parseEther("100"))
            ).to.be.revertedWith("Cannot recover RPR itself");
        });
    });

    describe("Access Control", function () {
        it("Should not allow non-owner to pause", async function () {
            await expect(reaper.connect(addr1).pause()).to.be.reverted;
        });

        it("Should not allow non-owner to enable trading", async function () {
            await expect(reaper.connect(addr1).enableTrading()).to.be.reverted;
        });

        it("Should not allow non-owner to blacklist", async function () {
            await expect(
                reaper.connect(addr1).setBlacklisted(addr2.address, true)
            ).to.be.reverted;
        });
    });
});
