// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@aave/core-v3/contracts/flashloan/interfaces/IFlashLoanSimpleReceiver.sol";

contract MockAavePool {
function flashLoanSimple(
        address receiverAddress,
        address asset,
        uint256 amount,
        bytes calldata params,
        uint16 // referralCode (parameter kept for interface compliance)
    ) external {
        // Simulate successful flash loan execution
        bool success = IFlashLoanSimpleReceiver(receiverAddress).executeOperation(
            asset,
            amount,
            0, // premium
            msg.sender,
            params
        );
        require(success, "Flash loan execution failed");
    }
}
