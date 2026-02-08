// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title GovernanceToken - Voting power for Agent Treasury
/// @notice ERC20 token that represents voting weight in the mini-DAO
contract GovernanceToken is ERC20, Ownable {
    constructor() ERC20("Agent Gov Token", "AGT") {
        // Mint 1M tokens to deployer
        _mint(msg.sender, 1_000_000 * 10 ** decimals());
    }

    /// @notice Treasury contract can mint tokens to new agents
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
