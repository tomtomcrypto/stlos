# Telos EVM Staking Contracts

This repository includes two smart contracts that make up the backend of the TLOS staking functionality on Telos EVM.

## Requirements

This repository requires NodeJS 14+ installed

## Deployment

To deploy the staking system you first need to deploy sTLOS and TelosEscrow on Telos EVM

### sTLOS & TelosEscrow

#### Install dependencies

`npm install`

#### Test

`npx hardhat test`

#### Deploy

`npx hardhat deploy --network testnet`

_Remember to save the contract's addresses_

#### Verify

`npx hardhat sourcify  --network testnet`

#### Transfer Ownership

After that you should transfer ownership of those contracts to the `prods.evm` linked EVM address for configuration of the `lockDuration` and `maxDeposits` variables.

#### Set configuration using a Native multisig

Follow our [native-to-evm-escrow-example](https://github.com/telosnetwork/native-to-evm-escrow-example) repository for an example of how to propose a multisig that calls a function of our TelosEscrow contract.

### EXRSRV.TF

Once sTLOS & TelosEscrow are deployed and configured all that is left is to upgrade and configure the __exrsrv.tf__ contract on Telos Native that distributes the staking rewards.
The configuration can be done using the following actions:

- `setratio(uint64_t ratio_value)` 
  -  The ratio_value is multiplied to the rewards sent to EVM, a ratio of 90 will for example decrease EVM rewards by 10% (Normal reward * .90)
- `setevmconfig(string stlos_contract, eosio::checksum256 storage_key, uint64_t wtlos_index)` actions.
  -  stlos_contract is your sTLOS EVM contract address
  -  storage_key is the computed storage key for the STLOS contract WTLOS balance
  -  wtlos_index is the index of WTLOS in the eosio.evm accounts table

#### Get the WTLOS index

The WTLOS index can be found on __eosio.evm__'s accounts table using the WTLOS EVM address (without the 0x)

#### Get the storage key

The storage key we are looking for is part of the address => uint balance mapping of WTLOS. We need to access the mapping value for the STLOS address in order to retreive its WTLOS balance.

To compute that storage key, you can use the following snippet:

```
    const provider = ethers.getDefaultProvider("https://testnet.telos.net/evm");

    const wtlos = "0x10b95d422f2c9714c331b1a14829886b0910f55d"; // WTLOS address on testnet
    const stlos = "0x10b95d422f2c9714c331b1a14829886b0910f55d"; // WTLOS address on testnet

    // Get the stlos balance slot aka our storage key
    const stlos_balance_slot = ethers.utils.keccak256(
        ethers.utils.hexZeroPad("0x02", 32),
        ethers.utils.hexZeroPad(stlos, 32),
    );
    console.log("Storage key:", stlos_balance_slot);
```

## EVM Contracts

### Staked TLOS

The Staked TLOS contract implements the IERC4262 tokenized vault standard

#### Rundown

- First, deposited TLOS are converted to sTLOS which represent shares of the TLOS pool
- The value of those sTLOS shares changes according to the balance of TLOS in the contract
- On withdraw, sTLOS is converted to TLOS and sent to the Escrow Contract

#### Public functions

`totalAssets(): uint256  `

Returns the total TLOS + WTLOS balance of the contract

`function previewDeposit(uint256 assets):uint256`

Preview shares returned on deposit of asset (rounded down)

`function previewMint(uint256 shares): uint256`

Preview assets value underlying the shares (rounded up)

`function previewRedeem(uint256 shares):uint256`

Preview assets returned on redeeming of shares (rounded down)

`function previewWithdraw(uint256 assets): uint256`

Preview the shares to withdraw from balance to withdraw assets (rounded up)

`function convertToShares(uint256 assets): uint256`

Converts assets to shares

`function convertToAssets(uint256 shares): uint256`

Converts shares to assets

`function maxDeposit(address): uint256`

Returns the max total deposit amount per address

`function maxMint(address): uint256` 

Returns the max mint amount per address

`function balanceOf(address owner): uint256`

Returns the share balance of an address

`function maxWithdraw(address owner): uint256`

Returns the max withdraw amount for an address

`function depositTLOS(): uint256`

Deposit TLOS to the contract

`function withdraw(uint256 assets,  address receiver, address owner)`

Withdraw assets to Telos Escrow contract

### Telos Escrow

The Telos Escrow contract locks token on deposit for a configurable amount of time (`lockDuration`)

#### Rundown

- TLOS is deposited in the contract and gets locked for  `lockDuration` amount of time
- Once unlocked, depositors can withdraw the TLOS to their account

#### Public functions

`lockDuration(): uint256 `

Returns the lock duration

`maxDeposits(): uint256 `

Returns the maximum number of deposits

`balanceOf(address depositor): uint256 `

Returns the total TLOS balance of a depositor (locked & unlocked)

`maxWithdraw(address depositor): uint256 `

Returns the current maximum TLOS withdraw (unlocked tokens) for a depositor

`depositsOf(address depositor): []`

Returns the deposits `{uint256 amount, uint256 until }` of a depositor

`deposit(address depositor): uint256 `

Deposits TLOS for depositor.

`withdraw(): uint256 `

Withdraw all unlocked TLOS

#### Events

`Withdraw(address _from, address _to, uint _amount)`

Emitted on sucessfull call to `withdraw()`

`Deposit(address _from, address _depositor, uint _amount)`

Emitted on sucessfull call to `deposit(address depositor)`
