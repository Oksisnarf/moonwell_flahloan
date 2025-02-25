// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockMoonwell {
    IERC20 public immutable usdc;
    address public owner;
    uint256 public collateralFactorBps = 7500; // 75% in basis points (10000 = 100%)
    
    // Track user deposits and borrows
    mapping(address => uint256) public collateralBalances;
    mapping(address => uint256) public borrowBalances;
    
    // Track total liquidity in protocol
    uint256 public totalReserves;

    event Deposited(address indexed user, uint256 amount);
    event Borrowed(address indexed user, uint256 amount);
    event Repaid(address indexed user, uint256 amount);
    event Redeemed(address indexed user, uint256 amount);

    constructor(address _usdc) {
        usdc = IERC20(_usdc);
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Unauthorized");
        _;
    }

    // Set collateral factor (7500 = 75%)
    function setCollateralFactor(uint256 newCollateralFactorBps) external onlyOwner {
        require(newCollateralFactorBps <= 9000, "CF too high"); // Max 90%
        collateralFactorBps = newCollateralFactorBps;
    }

    // Deposit USDC as collateral
    function mint(uint256 mintAmount) external {
        collateralBalances[msg.sender] += mintAmount;
        totalReserves += mintAmount;
        usdc.transferFrom(msg.sender, address(this), mintAmount);
        emit Deposited(msg.sender, mintAmount);
    }

    // Borrow against collateral (up to collateral factor)
    function borrow(uint256 borrowAmount) external {
        uint256 maxBorrow = (collateralBalances[msg.sender] * collateralFactorBps) / 10000;
        require(borrowAmount <= maxBorrow, "Exceeds borrow limit");
        require(borrowAmount <= totalReserves, "Insufficient protocol liquidity");

        borrowBalances[msg.sender] += borrowAmount;
        totalReserves -= borrowAmount;
        usdc.transfer(msg.sender, borrowAmount);
        emit Borrowed(msg.sender, borrowAmount);
    }

    // Repay borrowed funds
    function repayBorrow(uint256 repayAmount) external {
        require(repayAmount <= borrowBalances[msg.sender], "Overpayment");
        
        borrowBalances[msg.sender] -= repayAmount;
        totalReserves += repayAmount;
        usdc.transferFrom(msg.sender, address(this), repayAmount);
        emit Repaid(msg.sender, repayAmount);
    }

    // Withdraw collateral (only if healthy position)
    function redeem(uint256 redeemAmount) external {
        require(
            borrowBalances[msg.sender] <= (collateralBalances[msg.sender] - redeemAmount) * collateralFactorBps / 10000,
            "Remaining collateral insufficient"
        );
        
        collateralBalances[msg.sender] -= redeemAmount;
        totalReserves -= redeemAmount;
        usdc.transfer(msg.sender, redeemAmount);
        emit Redeemed(msg.sender, redeemAmount);
    }
}
