// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockAddressesProvider {
    address public pool;

    constructor() {}

    function setPool(address _pool) external {
        pool = _pool;
    }

    function getPool() external view returns (address) {
        return pool;
    }
}
