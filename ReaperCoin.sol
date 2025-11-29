// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title ReaperCoin (RPR)
/// @notice Fixed-supply ERC20 with burn, pause, permit, and rescue function.
contract ReaperCoin is ERC20, ERC20Burnable, ERC20Permit, Pausable, Ownable {
    uint256 private constant _INITIAL_SUPPLY = 88_888 * 10 ** 18;

    event ReaperPaused(address indexed by);
    event ReaperUnpaused(address indexed by);

    constructor(address owner_)
        ERC20("ReaperCoin", "RPR")
        ERC20Permit("ReaperCoin")
        Ownable(owner_)
    {
        _mint(owner_, _INITIAL_SUPPLY);
    }

    /** ------------------------------
        PAUSE / UNPAUSE
    -------------------------------*/
    function pause() external onlyOwner {
        _pause();
        emit ReaperPaused(msg.sender);
    }

    function unpause() external onlyOwner {
        _unpause();
        emit ReaperUnpaused(msg.sender);
    }

    /** ------------------------------
        TRANSFER OVERRIDE (REQUIRED FOR OZ v5)
    -------------------------------*/
    function _update(address from, address to, uint256 value)
        internal
        override
    {
        if (paused()) revert EnforcedPause();
        super._update(from, to, value);
    }

    /** ------------------------------
        OPTIONAL BUT IMPORTANT:
        RECOVER TOKENS SENT TO CONTRACT
    -------------------------------*/
    function recoverERC20(address token, uint256 amount) external onlyOwner {
        require(token != address(this), "Cannot recover RPR itself");
        IERC20(token).transfer(owner(), amount);
    }
}
