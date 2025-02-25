const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MoonwellFlashLoan", function () {
    let mockUSDC, mockAavePool, mockMoonwell, moonwellFlashLoan;
    let owner, user;

    beforeEach(async function () {
        [owner, user] = await ethers.getSigners();

        // Deploy Mock USDC
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        mockUSDC = await MockERC20.deploy("Mock USDC", "mUSDC");
        
        // Deploy MockAavePool
        const MockAavePool = await ethers.getContractFactory("MockAavePool");
        mockAavePool = await MockAavePool.deploy();
        
        // Deploy MockMoonwell
        const MockMoonwell = await ethers.getContractFactory("MockMoonwell");
        mockMoonwell = await MockMoonwell.deploy(mockUSDC.target);
        
        // Deploy MoonwellFlashLoan
        const MoonwellFlashLoan = await ethers.getContractFactory("MoonwellFlashLoan");
        moonwellFlashLoan = await MoonwellFlashLoan.deploy(
            mockAavePool.target,
            mockMoonwell.target,
            mockUSDC.target,
            mockAavePool.target // Using mockAavePool as addressesProvider for simplicity
        );

        // Setup initial balances
        await mockUSDC.mint(moonwellFlashLoan.target, ethers.parseUnits("1000", 6));
        await mockUSDC.mint(mockMoonwell.target, ethers.parseUnits("1000000", 6)); // Fund Moonwell pool
    });

    it("Should allow user deposits", async function () {
        const depositAmount = ethers.parseUnits("100", 6);
        await mockUSDC.mint(user.address, depositAmount);
        await mockUSDC.connect(user).approve(moonwellFlashLoan.target, depositAmount);
        await expect(moonwellFlashLoan.connect(user).depositUserFunds(depositAmount))
            .to.emit(moonwellFlashLoan, "UserDeposited")
            .withArgs(user.address, depositAmount);
    });

    it("Should execute flash loan with user deposits", async function () {
        const depositAmount = ethers.parseUnits("100", 6);
        const flashLoanAmount = ethers.parseUnits("100", 6);

        // User deposits funds
        await mockUSDC.mint(user.address, depositAmount);
        await mockUSDC.connect(user).approve(moonwellFlashLoan.target, depositAmount);
        await moonwellFlashLoan.connect(user).depositUserFunds(depositAmount);

        // Execute flash loan
        await expect(moonwellFlashLoan.executeFlashLoan(flashLoanAmount))
            .to.emit(moonwellFlashLoan, "FlashLoanExecuted")
            .withArgs(flashLoanAmount);
    });

    it("Should reinvest profits", async function () {
        const flashLoanAmount = ethers.parseUnits("100", 6);

        // Execute initial flash loan
        await moonwellFlashLoan.executeFlashLoan(flashLoanAmount);

        // Reinvest profits
        await expect(moonwellFlashLoan.reinvestProfits())
            .to.emit(moonwellFlashLoan, "ProfitsReinvested");
    });
});
