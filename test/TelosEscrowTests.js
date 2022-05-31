const { expect } = require("chai");
const { ethers } = require("hardhat");
const MAX_DEPOSIT = 10;
const LOCK_DURATION = 120;
const ZERO_TLOS = ethers.utils.parseEther("0.0");
const ONE_TLOS = ethers.utils.parseEther("1.0");
const TWO_TLOS = ethers.utils.parseEther("2.0");

describe("TelosEscrow", function () {
  let contract;
  let contractFactory;
  let authorized_address;
  let owner;

  beforeEach(async () => {
    contractFactory = await ethers.getContractFactory("TelosEscrow");
    const [_owner, addr1, addr2] = await ethers.getSigners();
    owner = _owner;
    authorized_address = addr2.address;
    contract = await contractFactory.deploy("TelosEscrow", authorized_address, MAX_DEPOSIT, LOCK_DURATION);
    let res = await contract.deployed();
  })

  describe("Correct setup", () => {
    it("Should be named 'TelosEscrow'", async () => {
      const name = await contract.name();
      expect(name).to.equal("TelosEscrow");
    });
    it("Should have the authorized address to change settings", async () => {
      const address = await contract.authorizedGovernanceAddress();
      expect(address).to.equal(authorized_address);
    });
    it("Should have the "+ MAX_DEPOSIT +" max deposits", async () => {
      const max = await contract.maxDeposits();
      expect(max).to.equal(MAX_DEPOSIT);
    });
    it("Should have a "+ LOCK_DURATION +"s lock duration", async () => {
      const duration = await contract.lockDuration();
      expect(duration).to.equal(LOCK_DURATION);
    });
  });

  describe("Settings", function () {

    it("Should return the new authorized contract for settings modification once changed", async function () {
      const [owner, addr1, addr2] = await ethers.getSigners();
      await contract.connect(addr2).setAuthorizedGovernanceAddress(addr1.address);
      const _authorizedAddress = await contract.authorizedGovernanceAddress();
      expect(_authorizedAddress).to.equal(addr1.address)
    });

    it("Should return the new max deposits, "+(MAX_DEPOSIT * 2)+", once changed", async function () {
      const [owner, addr1, addr2] = await ethers.getSigners();
      await contract.connect(addr2).setMaxDeposits(MAX_DEPOSIT * 2);
      expect(await contract.maxDeposits()).to.equal(MAX_DEPOSIT * 2);
    });

    it("Should return the new lock duration, "+(LOCK_DURATION * 2)+"s, once changed", async function () {
      const [owner, addr1, addr2] = await ethers.getSigners();
      await contract.connect(addr2).setLockDuration(LOCK_DURATION * 2);
      expect(await contract.lockDuration()).to.equal(LOCK_DURATION * 2);
    });
    it("Shouldn't let unauthorized addresses change settings", async function () {
      const [owner, addr1] = await ethers.getSigners();
      await expect(contract.connect(addr1).setMaxDeposits(MAX_DEPOSIT * 2 )).to.be.reverted;
      await expect(contract.connect(addr1).setLockDuration(LOCK_DURATION * 2)).to.be.reverted;
      await expect(contract.connect(addr1).setAuthorizedGovernanceAddress(addr1)).to.be.reverted;
    });
  })
  describe("Core", function () {
    it("Shouldn't be able to deposit 0 tokens", async function () {
      await expect(contract.deposit(owner.address)).to.be.reverted;
    });
    it("Should be able to deposit tokens for a specified address", async function () {
      let amount = 1;
      await contract.deposit(owner.address, {value: ONE_TLOS});
      // CHECK A DEPOSIT WAS MADE
      let total = await contract.balanceOf(owner.address);
      expect(total).to.be.equal(ONE_TLOS);
      // CHECK IT IS NOT UNLOCKED YET
      let unlocked = await contract.maxWithdraw(owner.address);
      expect(unlocked).to.equal(ZERO_TLOS);
    });

    it("Should return a balance details if a balance was deposited", async function () {
      await contract.deposit(owner.address, {value: ONE_TLOS});
      let balances = await contract.depositsOf(owner.address);
      expect(balances.length).to.equal(1);
      expect(balances[0].amount).to.equal(ONE_TLOS);
    });

    it("Should return a balance total if one or more balances were deposited", async function () {
      await contract.deposit(owner.address, {value: ONE_TLOS});
      await  contract.deposit(owner.address, {value: ONE_TLOS});
      const balance = await contract.balanceOf(owner.address);
      expect(balance).to.equal(TWO_TLOS);
    });

    it("Shouldn't let you have more than " + MAX_DEPOSIT + " deposits", async function () {
      for(var i=0; i < (MAX_DEPOSIT); i++){
        await expect(contract.deposit(owner.address, {value: ONE_TLOS})).to.not.be.reverted;
      }
      await expect(contract.deposit(owner.address, {value: ONE_TLOS})).to.be.reverted;
    });

    it("Shouldn't let you withdraw without a deposit", async function () {
      await expect(contract.withdraw()).to.be.reverted;
    });

    it("Shouldn't let you withdraw before lock of " + LOCK_DURATION + "s is over", async function () {
      // INCREASE TIME BY LOCK DURATION / 2
      await network.provider.send("evm_increaseTime", [LOCK_DURATION / 2])
      await network.provider.send("evm_mine")

      await expect(contract.withdraw()).to.be.reverted;

    });

    it("Should let you withdraw once " + LOCK_DURATION + "s lock is over", async function () {
      const oldBalance = owner.balance;
      await contract.deposit(owner.address, {value: ONE_TLOS});

      // INCREASE TIME BY LOCK DURATION + 1
      await network.provider.send("evm_increaseTime", [LOCK_DURATION + 1])
      await network.provider.send("evm_mine")

      // CHECK WITHDRAW
      await expect(contract.withdraw()).to.not.be.reverted;

      // CHECK REMAINING BALANCE IS 0 & FUNDS WERE RECEIVED
      const balance = await contract.balanceOf(owner.address);
      expect(balance).to.equal(0);
      expect(owner.balance == oldBalance);
    });
  })
});
