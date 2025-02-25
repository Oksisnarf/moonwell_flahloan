// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@aave/core-v3/contracts/flashloan/interfaces/IFlashLoanSimpleReceiver.sol";
import "@aave/core-v3/contracts/interfaces/IPool.sol";
import "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";

interface IMoonwellLending {
    function mint(uint256 mintAmount) external;
    function borrow(uint256 borrowAmount) external;
}

contract MoonwellFlashLoan is IFlashLoanSimpleReceiver {
    address public owner;
    IERC20 public immutable usdc;
    IPool public immutable aavePool;
    IMoonwellLending public immutable moonwell;
    IPoolAddressesProvider public immutable addressesProvider;

    event FlashLoanExecuted(uint256 amount);
    event UserDeposited(address user, uint256 amount);
    event ProfitsReinvested(uint256 amount);

    constructor(
        address _aavePool,
        address _moonwell,
        address _usdc,
        address _addressesProvider
    ) {
        owner = msg.sender;
        aavePool = IPool(_aavePool);
        moonwell = IMoonwellLending(_moonwell);
        usdc = IERC20(_usdc);
        addressesProvider = IPoolAddressesProvider(_addressesProvider);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    // 1. Implement ADDRESSES_PROVIDER()
    function ADDRESSES_PROVIDER() external view override returns (IPoolAddressesProvider) {
        return addressesProvider;
    }

    // 2. Implement POOL()
    function POOL() external view override returns (IPool) {
        return aavePool;
    }

    // 3. Implement executeOperation()
    function executeOperation(
        address, // asset
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata // params
    ) external override returns (bool) {
        require(msg.sender == address(aavePool), "Unauthorized caller");
        require(initiator == address(this), "Invalid initiator");

        uint256 totalRepayment = amount + premium;
        usdc.approve(address(aavePool), totalRepayment);

        emit FlashLoanExecuted(amount);
        return true;
    }

    function executeFlashLoan(uint256 amount) public onlyOwner {
        aavePool.flashLoanSimple(
            address(this),
            address(usdc),
            amount,
            "",
            0
        );
    }

    function depositUserFunds(uint256 amount) external {
        usdc.transferFrom(msg.sender, address(this), amount);
        emit UserDeposited(msg.sender, amount);
    }

    function reinvestProfits() external onlyOwner {
        uint256 profits = usdc.balanceOf(address(this));
        uint256 premium = (profits * 9) / 10000; // 0.09% fee
        uint256 availableAmount = profits - premium;
        
        executeFlashLoan(availableAmount);
        emit ProfitsReinvested(availableAmount);
    }
}
