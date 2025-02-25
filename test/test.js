const { expect } = require("chai");
const { ethers, network } = require("hardhat");

// Main test suite with mock contracts
describe("MoonwellFlashLoan", function () {
    // ... [Keep the existing mock-based tests unchanged] ...
});

// Forked mainnet tests (only runs when using --network hardhat with forking enabled)
describe("Forked Mainnet Tests", function () {
    let moonwellFlashLoan, usdc;
    const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
    const MOONWELL_LENDING_POOL = ethers.getAddress(
        "0x9c0bf2f0cf452b7e40b8e3c249f5b07286b154f5".toLowerCase()
    );
    const USDC_WHALE = "0x0a031967D6b3F261d010a1B8bB47bF6B71f8dC06";

    before(async function () {
        this.timeout(60000); // Increased timeout for forked setup

        // Only run on hardhat network with forking enabled
        if (network.name !== 'hardhat' || !network.config.forking) {
            console.log("Skipping forked tests...");
            this.skip();
        }

        try {
            [this.owner] = await ethers.getSigners();
            
            // Get real USDC contract
            usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);

            // Deploy mock Aave pool
            const MockAavePool = await ethers.getContractFactory("MockAavePool");
            const mockAavePool = await MockAavePool.deploy();

            // Deploy flash loan contract
            const MoonwellFlashLoan = await ethers.getContractFactory("MoonwellFlashLoan");
            moonwellFlashLoan = await MoonwellFlashLoan.deploy(
                mockAavePool.target,
                MOONWELL_LENDING_POOL,
                USDC_ADDRESS,
                mockAavePool.target
            );

            // Impersonate whale
            await network.provider.request({
                method: "hardhat_impersonateAccount",
                params: [USDC_WHALE],
            });
            const whale = await ethers.getSigner(USDC_WHALE);

            // Fund whale with ETH for gas (100 ETH)
            await network.provider.send("hardhat_setBalance", [
                USDC_WHALE,
                ethers.toBeHex(ethers.parseEther("100")) // 100 ETH in hex
            ]);

            // Verify ETH balance
            const whaleETHBalance = await ethers.provider.getBalance(USDC_WHALE);
            console.log("Whale ETH balance:", ethers.formatEther(whaleETHBalance));

            // Fund flash loan contract with USDC (with increased gas limit)
            const initialBalance = ethers.parseUnits("20000", 6);
            await usdc.connect(whale).transfer(
                moonwellFlashLoan.target, 
                initialBalance, 
                { gasLimit: 500000 } // Increased gas limit
            );

        } catch (error) {
            console.error("Forked test setup failed:", error);
            throw error;
        }
    });

    it("Should interact with real Moonwell contracts", async function () {
        this.timeout(30000); // Test-specific timeout

        // Validate contract setup
        expect(moonwellFlashLoan.target).to.be.properAddress;
        const initialBalance = await usdc.balanceOf(moonwellFlashLoan.target);
        expect(initialBalance).to.be.gt(0);

        const depositAmount = ethers.parseUnits("1000", 6);
        
        // Deposit and verify
        await usdc.approve(moonwellFlashLoan.target, depositAmount);
        await expect(moonwellFlashLoan.depositUserFunds(depositAmount))
            .to.emit(moonwellFlashLoan, "UserDeposited");

        const moonwell = await ethers.getContractAt("IMoonwellLending", MOONWELL_LENDING_POOL);
        const collateral = await moonwell.collateralBalances(moonwellFlashLoan.target);
        expect(collateral).to.be.closeTo(depositAmount, 100);

        // Execute flash loan
        const flashLoanAmount = ethers.parseUnits("300", 6);
        await expect(moonwellFlashLoan.executeFlashLoan(flashLoanAmount))
            .to.emit(moonwellFlashLoan, "FlashLoanExecuted")
            .withArgs(flashLoanAmount);
    });
});
