// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Lock {
    uint public unlockTime;
    address payable public owner;

    constructor(uint _unlockTime) payable {
        require(_unlockTime > block.timestamp, "Unlock time must be in the future");
        unlockTime = _unlockTime;
        owner = payable(msg.sender);
    }

    function withdraw() public {
        require(block.timestamp >= unlockTime, "You can't withdraw yet");
        require(msg.sender == owner, "You aren't the owner");

        uint amount = address(this).balance;
        owner.transfer(amount);

        emit Withdrawal(amount, block.timestamp);
    }

    event Withdrawal(uint amount, uint when);
}
