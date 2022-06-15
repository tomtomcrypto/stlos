//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract TelosEscrow is Ownable {

    event Withdraw(address _from, address _to, uint _amount);
    event Deposit(address _from, address _depositor, uint _amount);

    struct lockedTokens {
        uint amount;
        uint until;
    }

    mapping(address => lockedTokens[]) internal deposits;
    uint public lockDuration;
    uint public maxDeposits;

    constructor(uint _maxDeposits, uint _lockDuration) {
        lockDuration = _lockDuration;
        maxDeposits = _maxDeposits;
    }

    /** Set maximum deposits per address, owner only */
    function setMaxDeposits(uint _maxDeposits) external onlyOwner {
        maxDeposits = _maxDeposits;
    }

    /** Set the lock duration, owner only */
    function setLockDuration(uint _lockDuration) external onlyOwner {
        lockDuration = _lockDuration;
    }

    /** Get the deposits of an address */
    function depositsOf(address depositor) external view returns (lockedTokens[] memory) {
        require(deposits[depositor].length > 0, "No deposits for this address");
        return deposits[depositor];
    }

    /** Get the total balance held of an address */
    function balanceOf(address depositor) external view returns (uint) {
        uint total = 0;
        lockedTokens[] memory tokens = deposits[depositor];
        for (uint i=0; i<tokens.length; i++) {
            total = total + tokens[i].amount;
        }
        return total;
    }

    /** Get the total unlocked balance held of an address */
    function maxWithdraw(address depositor) external view returns (uint) {
        uint unlocked = 0;
        lockedTokens[] memory tokens = deposits[depositor];
        for (uint i=0; i < tokens.length; i++) {
            unlocked = (tokens[i].until > block.timestamp) ? unlocked : unlocked + tokens[i].amount;
        }
        return unlocked;
    }

    /** Deposit new TLOS */
    function deposit(address depositor) payable external {
        require(msg.value > 0, "Amount needs to be greater than 0");
        require(deposits[depositor].length < maxDeposits, "Maximum deposits count for address was reached. Please withdraw unlocked tokens or wait.");
        uint expiry = block.timestamp + lockDuration;
        lockedTokens memory lockedToken = lockedTokens(msg.value, expiry);
        deposits[depositor].push(lockedToken);
        emit Deposit(msg.sender, depositor, msg.value);
    }

    /** Withdraw unlocked TLOS */
    function withdraw() external {
        uint amount = 0;
        lockedTokens[] storage tokens = deposits[msg.sender];
        // REMOVE UNLOCKED TOKENS & GET TOTAL AMOUNT
        for (uint i=0; i<tokens.length; i++) {
            if(tokens[i].until <= block.timestamp){
                amount = amount + tokens[i].amount;
                tokens[i] = tokens[tokens.length-1];
                tokens.pop();
            }
        }
        require(amount > 0, "You do not have any unlocked tokens to withdraw");

        address payable receiver = payable(msg.sender);

        // Keep that at end to guard vs reentrancy attacks (locked tokens already deleted from here)
        (bool success, ) = receiver.call{value : amount}("");
        require(success, "The transfer failed.");

        emit Withdraw(msg.sender, receiver, amount);
    }
}
