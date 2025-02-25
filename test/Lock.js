const { time, loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { network } = require("hardhat");

    describe("Lock", function () {
        // Add network check at the top level
        before(function () {
            if (network.name === 'hardhat' && network.config.forking) {
                this.skip();
            }
        });

        async function deployOneYearLockFixture() {
            const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;
            const unlockTime = (await time.latest()) + ONE_YEAR_IN_SECS;

            const [owner] = await ethers.getSigners();
            const Lock = await ethers.getContractFactory("Lock");
            const lock = await Lock.deploy(unlockTime, { value: ethers.parseEther("1") });

            return { lock, unlockTime, owner };
        }

    describe("Deployment", function () {
        it("Should set the right unlockTime", async function () {
            const { lock, unlockTime } = await loadFixture(deployOneYearLockFixture);
            expect(await lock.unlockTime()).to.equal(unlockTime);
        });

        it("Should set the right owner", async function () {
            const { lock, owner } = await loadFixture(deployOneYearLockFixture);
            expect(await lock.owner()).to.equal(owner.address);
        });

        it("Should receive and store the funds to lock", async function () {
            const { lock } = await loadFixture(deployOneYearLockFixture);
            expect(await ethers.provider.getBalance(lock.target)).to.equal(ethers.parseEther("1"));
        });

        it("Should fail if the unlockTime is not in the future", async function () {
            const latestTime = await time.latest();
            const Lock = await ethers.getContractFactory("Lock");
            await expect(Lock.deploy(latestTime, { value: 1 })).to.be.revertedWith(
                "Unlock time must be in the future"
            );
        });
    });

    describe("Withdrawals", function () {
        describe("Validations", function () {
            it("Should revert with the right error if called too soon", async function () {
                const { lock } = await loadFixture(deployOneYearLockFixture);
                await expect(lock.withdraw()).to.be.revertedWith("You can't withdraw yet");
            });

            it("Should revert with the right error if called from another account", async function () {
                const { lock } = await loadFixture(deployOneYearLockFixture);
                const [owner, otherAccount] = await ethers.getSigners();
                await time.increaseTo(await lock.unlockTime());
                await expect(lock.connect(otherAccount).withdraw()).to.be.revertedWith("You aren't the owner");
            });

            it("Shouldn't fail if the unlockTime has arrived and the owner calls it", async function () {
                const { lock } = await loadFixture(deployOneYearLockFixture);
                await time.increaseTo(await lock.unlockTime());
                await expect(lock.withdraw()).not.to.be.reverted;
            });
        });

        describe("Events", function () {
            it("Should emit an event on withdrawals", async function () {
                const { lock } = await loadFixture(deployOneYearLockFixture);
                await time.increaseTo(await lock.unlockTime());
                await expect(lock.withdraw())
                    .to.emit(lock, "Withdrawal")
                    .withArgs(ethers.parseEther("1"), (val) => val > 0);
            });
        });

        describe("Transfers", function () {
            it("Should transfer the funds to the owner", async function () {
                const { lock, owner } = await loadFixture(deployOneYearLockFixture);
                await time.increaseTo(await lock.unlockTime());
                const initialBalance = await ethers.provider.getBalance(owner.address);
                const tx = await lock.withdraw();
                const receipt = await tx.wait();
                const gasUsed = receipt.gasUsed * tx.gasPrice;
                const finalBalance = await ethers.provider.getBalance(owner.address);
                expect(finalBalance).to.equal(initialBalance + ethers.parseEther("1") - gasUsed);
            });
        });
    });
})
