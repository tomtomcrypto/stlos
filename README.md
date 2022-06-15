# Telos EVM Staking Contracts

This repository includes two smart contracts that make up the backend of the TLOS staking functionality on Telos EVM.

## Staked TLOS

The Staked TLOS contract implements ....

### Rundown

- First, TLOS are deposited against sTLOS which represent shares of the TLOS pool
- The value of those sTLOS shares changes according to the balance of TLOS in the contract
- On withdraw, sTLOS is converted to TLOS and sent to the Escrow Contract

### Public variables

### Public functions

## Telos Escrow

The Telos Escrow contract locks token on deposit for a configurable amount of time (`lockDuration`)

### Rundown

### Public variables

### Public functions