// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title ReaperCoin (RPR)
/// @author Reaper Protocol Team
/// @notice Next-generation deflationary token with anti-whale protection
/// @dev Fixed-supply ERC20: burn, pause, permit, anti-whale, rescue
contract ReaperCoin is ERC20, ERC20Burnable, ERC20Permit, Pausable, Ownable {

    uint256 public constant TOTAL_SUPPLY = 666_666_666 * 10 ** 18;
    uint256 public constant BURN_RATE = 100;
    uint256 public constant BASIS_POINTS = 10_000;

    uint256 public maxTransactionAmount;
    uint256 public maxWalletBalance;
    uint256 public totalBurned;
    bool public tradingEnabled;
    bool public antiWhaleEnabled = true;

    mapping(address => bool) public isExcludedFromLimits;
    mapping(address => bool) public isBlacklisted;

    event TradingEnabled(uint256 timestamp);
    event AntiWhaleUpdated(bool enabled);
    event MaxTransactionUpdated(uint256 newMax);
    event MaxWalletUpdated(uint256 newMax);
    event TokensBurned(address indexed from, uint256 amount);
    event AddressBlacklisted(address indexed account, bool blacklisted);
    event AddressExcluded(address indexed account, bool excluded);
    event TokensRecovered(address indexed token, uint256 amount);
    event ReaperPaused(address indexed by);
    event ReaperUnpaused(address indexed by);

    constructor(address owner_)
        ERC20("ReaperCoin", "RPR")
        ERC20Permit("ReaperCoin")
        Ownable(owner_)
    {
        maxTransactionAmount = TOTAL_SUPPLY / 100;
        maxWalletBalance = (TOTAL_SUPPLY * 2) / 100;
        isExcludedFromLimits[owner_] = true;
        isExcludedFromLimits[address(this)] = true;
        _mint(owner_, TOTAL_SUPPLY);
    }

    function enableTrading() external onlyOwner {
        require(!tradingEnabled, "Trading already enabled");
        tradingEnabled = true;
        emit TradingEnabled(block.timestamp);
    }

    function setAntiWhaleEnabled(bool enabled) external onlyOwner {
        antiWhaleEnabled = enabled;
        emit AntiWhaleUpdated(enabled);
    }

    function setMaxTransactionAmount(uint256 amount) external onlyOwner {
        require(amount >= TOTAL_SUPPLY / 1000, "Cannot set below 0.1%");
        maxTransactionAmount = amount;
        emit MaxTransactionUpdated(amount);
    }

    function setMaxWalletBalance(uint256 amount) external onlyOwner {
        require(amount >= (TOTAL_SUPPLY * 5) / 1000, "Cannot set below 0.5%");
        maxWalletBalance = amount;
        emit MaxWalletUpdated(amount);
    }

    function setBlacklisted(address account, bool blacklisted) external onlyOwner {
        require(account != owner(), "Cannot blacklist owner");
        isBlacklisted[account] = blacklisted;
        emit AddressBlacklisted(account, blacklisted);
    }

    function setExcludedFromLimits(address account, bool excluded) external onlyOwner {
        isExcludedFromLimits[account] = excluded;
        emit AddressExcluded(account, excluded);
    }

    function pause() external onlyOwner {
        _pause();
        emit ReaperPaused(msg.sender);
    }

    function unpause() external onlyOwner {
        _unpause();
        emit ReaperUnpaused(msg.sender);
    }

    function _update(address from, address to, uint256 value) internal override {
        if (paused()) revert EnforcedPause();
        if (from != address(0) && to != address(0)) {
            require(!isBlacklisted[from] && !isBlacklisted[to], "Address blacklisted");
            if (!isExcludedFromLimits[from] && !isExcludedFromLimits[to]) {
                require(tradingEnabled, "Trading not yet enabled");
            }
            if (antiWhaleEnabled) {
                if (!isExcludedFromLimits[from]) {
                    require(value <= maxTransactionAmount, "Exceeds max transaction");
                }
                if (!isExcludedFromLimits[to]) {
                    require(balanceOf(to) + value <= maxWalletBalance, "Exceeds max wallet balance");
                }
            }
            uint256 burnAmount = (value * BURN_RATE) / BASIS_POINTS;
            if (burnAmount > 0) {
                totalBurned += burnAmount;
                super._update(from, address(0), burnAmount);
                emit TokensBurned(from, burnAmount);
                value -= burnAmount;
            }
        }
        super._update(from, to, value);
    }

    function recoverERC20(address token, uint256 amount) external onlyOwner {
        require(token != address(this), "Cannot recover RPR itself");
        IERC20(token).transfer(owner(), amount);
        emit TokensRecovered(token, amount);
    }

    function circulatingSupply() external view returns (uint256) {
        return TOTAL_SUPPLY - totalBurned;
    }

    function burnPercentage() external view returns (uint256) {
        return (totalBurned * BASIS_POINTS) / TOTAL_SUPPLY;
    }
}
