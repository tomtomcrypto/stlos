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
  let owner, addr1;

  beforeEach(async () => {
    contractFactory = await ethers.getContractFactory("TelosEscrow");
    const [_owner, _addr1] = await ethers.getSigners();
    owner = _owner;
    addr1 = _addr1;
    contract = await contractFactory.deploy(MAX_DEPOSIT, LOCK_DURATION);
    const res = await contract.deployed();
  });

  describe("Correct setup", () => {
    it("Should have the " + MAX_DEPOSIT + " max deposits", async () => {
      const max = await contract.maxDeposits();
      expect(max).to.equal(MAX_DEPOSIT);
    });

    it("Should have a " + LOCK_DURATION + "s lock duration", async () => {
      const duration = await contract.lockDuration();
      expect(duration).to.equal(LOCK_DURATION);
    });

    it("Should return the owner", async function () {
      expect(await contract.owner()).to.equal(owner.address);
    });
  });

  describe("Settings", function () {
    it(
      "Should return the new max deposits, " +
        MAX_DEPOSIT * 2 +
        ", once changed",
      async function () {
        await contract.connect(owner).setMaxDeposits(MAX_DEPOSIT * 2);
        expect(await contract.maxDeposits()).to.equal(MAX_DEPOSIT * 2);
      }
    );

    it(
      "Should return the new lock duration, " +
        LOCK_DURATION * 2 +
        "s, once changed",
      async function () {
        await contract.connect(owner).setLockDuration(LOCK_DURATION * 2);
        expect(await contract.lockDuration()).to.equal(LOCK_DURATION * 2);
      }
    );

    it("Shouldn't let unauthorized addresses set max deposits", async function () {
      const [owner, addr1] = await ethers.getSigners();
      await expect(contract.connect(addr1).setMaxDeposits(MAX_DEPOSIT * 2)).to
        .be.reverted;
    });

    it("Shouldn't let unauthorized addresses set lock duration", async function () {
      const [owner, addr1] = await ethers.getSigners();
      await expect(contract.connect(addr1).setLockDuration(LOCK_DURATION * 2))
        .to.be.reverted;
    });

    it("Shouldn't let unauthorized addresses transfer ownership", async function () {
      const [owner, addr1] = await ethers.getSigners();
      await expect(contract.connect(addr1).transferOwnership(addr1.address)).to
        .be.reverted;
    });

    it("Should let the owner transfer ownership", async function () {
      await expect(contract.connect(owner).transferOwnership(addr1.address)).to
        .not.be.reverted;
      expect(await contract.owner()).to.equal(addr1.address);
    });
  });

  describe("Core", function () {
    it("Shouldn't be able to deposit 0 tokens", async function () {
      await expect(contract.deposit(owner.address)).to.be.reverted;
    });

    it("Should store deposit", async function () {
      await contract.deposit(owner.address, { value: ONE_TLOS });
      // CHECK A DEPOSIT WAS MADE
      const deposits = await contract.depositsOf(owner.address);
      expect(deposits.length).to.be.equal(1);
    });

    it("Should lock deposit", async function () {
      await contract.deposit(owner.address, { value: ONE_TLOS });
      // CHECK IT IS NOT UNLOCKED YET
      const unlocked = await contract.maxWithdraw(owner.address);
      expect(unlocked).to.equal(ZERO_TLOS);
    });

    it("Should return escrow balance", async function () {
      await contract.deposit(owner.address, { value: ONE_TLOS });
      // CHECK ESCROW BALANCE
      const total = await contract.balanceOf(owner.address);
      expect(total).to.be.equal(ONE_TLOS);
    });

    it("Should return escrow balance total for multiple deposits", async function () {
      await contract.deposit(owner.address, { value: ONE_TLOS });
      await contract.deposit(owner.address, { value: ONE_TLOS });
      const balance = await contract.balanceOf(owner.address);
      expect(balance).to.equal(TWO_TLOS);
    });

    it("Should return a deposit amount", async function () {
      await contract.deposit(owner.address, { value: ONE_TLOS });
      const deposits = await contract.depositsOf(owner.address);
      expect(deposits[0].amount).to.equal(ONE_TLOS);
    });

    it(
      "Shouldn't let you have more than " + MAX_DEPOSIT + " deposits",
      async function () {
        for (let i = 0; i < MAX_DEPOSIT; i++) {
          await expect(contract.deposit(owner.address, { value: ONE_TLOS })).to
            .not.be.reverted;
        }
        await expect(contract.deposit(owner.address, { value: ONE_TLOS })).to.be
          .reverted;
      }
    );

    it("Shouldn't let you withdraw without a deposit", async function () {
      await expect(contract.withdraw()).to.be.reverted;
    });

    it(
      "Shouldn't let you withdraw before lock of " +
        LOCK_DURATION +
        "s is over",
      async function () {
        await contract.deposit(owner.address, { value: ONE_TLOS });
        await expect(contract.withdraw()).to.be.reverted;
      }
    );

    it(
      "Should let you withdraw once " + LOCK_DURATION + "s lock is over",
      async function () {
        const oldBalance = owner.balance;
        await contract.deposit(owner.address, { value: ONE_TLOS });
        let balance = await contract.balanceOf(owner.address);
        expect(balance).to.equal(ONE_TLOS);

        // INCREASE TIME BY LOCK DURATION + 1
        await network.provider.send("evm_increaseTime", [LOCK_DURATION + 1]);
        await network.provider.send("evm_mine");

        // CHECK WITHDRAW
        await contract.withdraw();

        // CHECK REMAINING BALANCE IS 0 & FUNDS WERE RECEIVED
        balance = await contract.balanceOf(owner.address);
        expect(balance).to.equal(0);
        expect(owner.balance === oldBalance);
      }
    );

    it(
      "Should let you withdraw multiple deposits once " +
        LOCK_DURATION +
        "s lock is over",
      async function () {
        const oldBalance = owner.balance;
        await contract.deposit(owner.address, { value: ONE_TLOS });
        await contract.deposit(owner.address, { value: ONE_TLOS });
        await contract.deposit(owner.address, { value: ONE_TLOS });
        await contract.deposit(owner.address, { value: ONE_TLOS });
        await contract.deposit(owner.address, { value: ONE_TLOS });

        // INCREASE TIME BY LOCK DURATION + 1
        await network.provider.send("evm_increaseTime", [LOCK_DURATION + 2]);
        await network.provider.send("evm_mine");

        // CHECK CURRENT DEPOSITS
        let deposits = await contract.depositsOf(owner.address);
        expect(deposits.length).to.equal(5);

        await contract.withdraw();

        // CHECK REMAINING DEPOSITS
        deposits = await contract.depositsOf(owner.address);
        expect(deposits.length).to.equal(0);
        expect(owner.balance === oldBalance);
      }
    );

    it("Should not withdraw locked deposits", async function () {
      // UNLOCKED
      await contract.deposit(owner.address, { value: ONE_TLOS });
      await contract.deposit(owner.address, { value: ONE_TLOS });
      await contract.deposit(owner.address, { value: ONE_TLOS });

      // INCREASE TIME BY LOCK DURATION + 1
      await network.provider.send("evm_increaseTime", [LOCK_DURATION + 2]);
      await network.provider.send("evm_mine");

      // LOCKED
      await contract.deposit(owner.address, { value: ONE_TLOS });
      await contract.deposit(owner.address, { value: ONE_TLOS });

      // CHECK WITHDRAW
      await contract.withdraw();

      // CHECK REMAINING DEPOSITS
      const deposits = await contract.depositsOf(owner.address);
      expect(deposits.length).to.equal(2);
    });
  });
});
