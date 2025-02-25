const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // Deploy MockERC20 (Mock USDC)
    const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
    const mockUSDC = await MockERC20.deploy("Mock USDC", "mUSDC");
    await mockUSDC.deployed();
    console.log("Mock USDC deployed at:", mockUSDC.address);

    // Deploy MockAavePool
    const MockAavePool = await hre.ethers.getContractFactory("MockAavePool");
    const mockAavePool = await MockAavePool.deploy();
    await mockAavePool.deployed();
    console.log("Mock Aave Pool deployed at:", mockAavePool.address);

    // Deploy MockMoonwell
    const MockMoonwell = await hre.ethers.getContractFactory("MockMoonwell");
    const mockMoonwell = await MockMoonwell.deploy();
    await mockMoonwell.deployed();
    console.log("Mock Moonwell deployed at:", mockMoonwell.address);

    // Deploy MockAddressesProvider
    const MockAddressesProvider = await hre.ethers.getContractFactory("MockAddressesProvider");
    const mockAddressesProvider = await MockAddressesProvider.deploy();
    await mockAddressesProvider.deployed();
    console.log("Mock Addresses Provider deployed at:", mockAddressesProvider.address);

    // Deploy MoonwellFlashLoan with mock addresses
    const MoonwellFlashLoan = await ethers.getContractFactory("MoonwellFlashLoan");
    const moonwellFlashLoan = await MoonwellFlashLoan.deploy(
        mockAavePool.target,
        mockMoonwell.target,
        mockUSDC.target,
        mockAddressesProvider.target // Add this parameter
    );
    await moonwellFlashLoan.deployed();
    console.log("MoonwellFlashLoan contract deployed at:", moonwellFlashLoan.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
    