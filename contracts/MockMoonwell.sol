// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockMoonwell {
    IERC20 public immutable usdc;
    mapping(address => uint256) public balances;
    mapping(address => uint256) public borrows;

    constructor(address _usdc) {
        usdc = IERC20(_usdc);
    }

    function mint(uint256 mintAmount) external {
        balances[msg.sender] += mintAmount;
        usdc.transferFrom(msg.sender, address(this), mintAmount);
    }

    function borrow(uint256 borrowAmount) external {
        require(balances[msg.sender] >= borrowAmount, "Insufficient collateral");
        borrows[msg.sender] += borrowAmount;
        // Mint borrowed amount to borrower
        (bool success, ) = address(usdc).call(
            abi.encodeWithSignature("mint(address,uint256)", msg.sender, borrowAmount)
        );
        require(success, "Borrow mint failed");
    }

    function repayBorrow(uint256 repayAmount) external {
        borrows[msg.sender] -= repayAmount;
        usdc.transferFrom(msg.sender, address(this), repayAmount);
    }

    function redeem(uint256 redeemTokens) external {
        balances[msg.sender] -= redeemTokens;
        usdc.transfer(msg.sender, redeemTokens);
    }
}
