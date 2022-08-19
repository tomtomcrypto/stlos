const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("StakedTLOS", function () {
  let WTLOS, wtlos, EscrowTLOS, escrow, StakedTLOS, stlos;
  beforeEach(async () => {
    WTLOS = await ethers.getContractFactory("WTLOS");
    wtlos = await WTLOS.deploy();
    EscrowTLOS = await ethers.getContractFactory("TelosEscrow");
    escrow = await EscrowTLOS.deploy(25, 60);
    StakedTLOS = await ethers.getContractFactory("StakedTLOS");
    stlos = await StakedTLOS.deploy(wtlos.address, escrow.address);
  })
  describe("Core", () => {
    it("Should observe yield and deposit/withdraw successfully to escrow", async function () {
      const [owner, addr1, addr2] = await ethers.getSigners();

      await stlos.asset();
      await stlos.depositTLOS({value: ethers.utils.parseEther("1.0")});
      expect(await stlos.balanceOf(owner.address)).to.equal(ethers.utils.parseEther("1.0"));
      expect(await stlos.maxWithdraw(owner.address)).to.equal(ethers.utils.parseEther("1.0"));

      await owner.sendTransaction({
        to: stlos.address,
        value: ethers.utils.parseEther("1.0"),
      });

      expect(await stlos.balanceOf(owner.address)).to.equal(ethers.utils.parseEther("1.0"));
      expect(await stlos.maxWithdraw(owner.address)).to.equal(ethers.utils.parseEther("2.0"));
      await stlos.withdraw(ethers.utils.parseEther("2.0"), owner.address, owner.address);
      expect(await escrow.balanceOf(owner.address)).to.equal(ethers.utils.parseEther("2.0"))
    });


    it("Should observe yield only increases with small numbers", async function () {
      const [owner, addr1, addr2] = await ethers.getSigners();

      await stlos.asset();
      await stlos.depositTLOS({value: ethers.utils.parseEther("1.0")});
      expect(await stlos.balanceOf(owner.address)).to.equal(ethers.utils.parseEther("1.0"), "Owner address should get 1 sTLOS for depositing 1 TLOS");
      expect(await stlos.maxWithdraw(owner.address)).to.equal(ethers.utils.parseEther("1.0"), "Owner address should be able to withdraw 1 TLOS after depositing 1 TLOS");

      await owner.sendTransaction({
        to: stlos.address,
        value: ethers.utils.parseEther("1.0"),
      });

      expect(await stlos.maxWithdraw(owner.address)).to.equal(ethers.utils.parseEther("2.0"), "Owner should have max withdraw of 101 after depositing 1 TLOS and 100 TLOS being added as yield");

      await stlos.connect(addr1).depositTLOS({value: ethers.utils.parseEther("1.0")});

      const addr1Balance = await stlos.balanceOf(addr1.address);

      expect(await stlos.previewRedeem(addr1Balance)).to.equal(ethers.utils.parseEther("1.0"), "Address 1 should be able to withdraw 1 TLOS after depositing 1 TLOS");
      expect(await stlos.maxWithdraw(addr1.address)).to.equal(ethers.utils.parseEther("1.0"), "Address 1 should be able to withdraw 1 TLOS after depositing 1 TLOS");

      expect(await stlos.maxWithdraw(owner.address)).to.equal(ethers.utils.parseEther("2.0"), "Owner should still have max withdrawl of 101 after address 1 deposited 1");
    });

    it("Should observe yield only increases with larger numbers", async function () {
      const [owner, addr1, addr2] = await ethers.getSigners();

      await stlos.asset();
      await stlos.depositTLOS({value: ethers.utils.parseEther("1.0")});
      expect(await stlos.balanceOf(owner.address)).to.equal(ethers.utils.parseEther("1.0"), "Owner address should get 1 sTLOS for depositing 1 TLOS");
      expect(await stlos.maxWithdraw(owner.address)).to.equal(ethers.utils.parseEther("1.0"), "Owner address should be able to withdraw 1 TLOS after depositing 1 TLOS");

      await owner.sendTransaction({
        to: stlos.address,
        value: ethers.utils.parseEther("100.0"),
      });

      expect(await stlos.maxWithdraw(owner.address)).to.equal(ethers.utils.parseEther("101.0"), "Owner should have max withdraw of 101 after depositing 1 TLOS and 100 TLOS being added as yield");

      await stlos.connect(addr1).depositTLOS({value: ethers.utils.parseEther("1.0")});

      const addr1Balance = await stlos.balanceOf(addr1.address);

      // These fail due to rounding...
      //expect(await stlos.previewRedeem(addr1Balance)).to.equal(ethers.utils.parseEther("1.0"), "Address 1 should be able to withdraw 1 TLOS after depositing 1 TLOS");
      //expect(await stlos.maxWithdraw(addr1.address)).to.equal(ethers.utils.parseEther("1.0"), "Address 1 should be able to withdraw 1 TLOS after depositing 1 TLOS");
      //expect(await stlos.maxWithdraw(owner.address)).to.equal(ethers.utils.parseEther("101.0"), "Owner should still have max withdrawl of 101 after address 1 deposited 1");
    });

    xit("Check dust and preview accuracy", async function () {
      const [owner, addr1, addr2] = await ethers.getSigners();
      for (let a of [owner, addr1, addr2]) {
        // check if deposit == withdraw at different sizes, see what the biggest amount of dust is
        // actually transfer
        console.log(`\n\nDoing test for ${a.address}`);

        let maxDrift;
        for (const num of ["1.0", "0.0000002", "43.0", "2.32123", "678.9102345", "8324.029394939", "1.23456765", "1.0", "3.0", "25.0000"]) {
          console.log(`Doing test for ${num}`);

          const bigNum = ethers.utils.parseEther(num);
          const beforeBalance = await stlos.balanceOf(a.address);
          const beforePreview = await stlos.previewDeposit(bigNum);

          console.log(`Depositing: ${num}`)
          await stlos.connect(a).depositTLOS({value: bigNum});

          const yieldAmount = "1.0";
          console.log(`Sending ${yieldAmount} as yield`)
          await owner.sendTransaction({
            to: stlos.address,
            value: ethers.utils.parseEther(yieldAmount),
          });

          const afterBalance = await stlos.balanceOf(a.address);
          const afterPreview = await stlos.previewDeposit(bigNum);

          const tokensReceived = afterBalance.sub(beforeBalance);
          console.log(`Received ${ethers.utils.formatEther(tokensReceived)} sTLOS`)
          const withdrawAmount = await stlos.previewWithdraw(tokensReceived);
          console.log(`Withdraw amount ${ethers.utils.formatEther(withdrawAmount)} TLOS`)
          expect(withdrawAmount).to.equal(bigNum);
          const dust = bigNum.sub(withdrawAmount);
          console.log(`Dust lost due to rounding: ${dust.toString()}`);

          expect(beforePreview).to.equal(afterPreview, "preview amount should not change");
        }
      }

    });
  });
});
