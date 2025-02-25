// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol"; // Add this line
import "@aave/core-v3/contracts/flashloan/interfaces/IFlashLoanSimpleReceiver.sol";

contract MockAavePool {
    function flashLoanSimple(
        address receiverAddress,
        address asset,
        uint256 amount,
        bytes calldata params,
        uint16 /* referralCode */  // Comment out unused param name
    ) external {
        uint256 premium = (amount * 9) / 10000;
        
        bool success = IFlashLoanSimpleReceiver(receiverAddress).executeOperation(
            asset,
            amount,
            premium,
            msg.sender,
            params
        );
        require(success, "Flash loan execution failed");
        
        IERC20(asset).transferFrom( // Now IERC20 is recognized
            receiverAddress,
            address(this),
            amount + premium
        );
    }
}
