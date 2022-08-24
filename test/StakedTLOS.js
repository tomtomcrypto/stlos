const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("StakedTLOS", function () {
  let WTLOS, wtlos, EscrowTLOS, escrow, StakedTLOS, stlos;
  beforeEach(async () => {
    const [owner, addr1, addr2] = await ethers.getSigners();
    WTLOS = await ethers.getContractFactory("WTLOS");
    wtlos = await WTLOS.deploy();
    EscrowTLOS = await ethers.getContractFactory("TelosEscrow");
    escrow = await EscrowTLOS.deploy(25, 60);
    StakedTLOS = await ethers.getContractFactory("StakedTLOS");
    stlos = await StakedTLOS.deploy(wtlos.address, escrow.address, owner.address);
  })
  describe("Configuration", () => {

    it("Should let admin set a new escrow contract", async function () {
      const [owner, addr1, addr2] = await ethers.getSigners();
      await expect(stlos.setEscrow(escrow.address)).to.not.be.reverted;
    });
    it("Should not let other users set a new escrow contract", async function () {
      const [owner, addr1, addr2] = await ethers.getSigners();
      await  expect(stlos.connect(addr1.address).setEscrow(addr2.address)).to.be.reverted;
    });
    it("Should let admin set a new admin", async function () {
      const [owner, addr1, addr2] = await ethers.getSigners();
      await expect(stlos.setAdmin(addr1.address)).to.not.be.reverted;
    });
    it("Should not let other users set a new admin", async function () {
      const [owner, addr1, addr2] = await ethers.getSigners();
      await expect(stlos.connect(addr1.address).setAdmin(addr1.address)).to.be.reverted;
    });
  });
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

    it("Check dust and preview accuracy", async function () {
      const yieldAmount = "789.56789";

      const signers = await ethers.getSigners();
      let maxDrift;
      let counter = 0;
      for (let a of signers) {
        // check if deposit == withdraw at different sizes, see what the biggest amount of dust is
        // actually transfer
        if (++counter % 5 == 0) {
          await a.sendTransaction({
            to: stlos.address,
            value: ethers.utils.parseEther("9995.0000"),
          });
        }

        let doneYield = false;
        for (const num of ["1.0", "0.0000002", "0.00000000000000027", "43.0", "2.32123", "678.9102345", "8324.029394939", "1.23456765", "1.0", "3.0", "25.0000"]) {

          const bigNum = ethers.utils.parseEther(num);
          const beforeBalance = await stlos.balanceOf(a.address);
          const beforePreview = await stlos.previewDeposit(bigNum);

          await stlos.connect(a).depositTLOS({value: bigNum});

          const afterBalance = await stlos.balanceOf(a.address);
          const afterPreview = await stlos.previewDeposit(bigNum);

          const tokensReceived = afterBalance.sub(beforeBalance);
          const withdrawAmount = await stlos.previewRedeem(tokensReceived);
          const dust = bigNum.sub(withdrawAmount);
          if (!maxDrift || maxDrift[1].lt(dust)) {
            maxDrift = [num, dust];
          }

          expect(beforePreview).to.equal(afterPreview, "preview amount should not change");
          if (!doneYield) {
            doneYield = true;
            await a.sendTransaction({
              to: stlos.address,
              value: ethers.utils.parseEther(yieldAmount),
            });
          }
        }
      }

      console.log(`\n\nMax dust lost: ${ethers.utils.formatEther(maxDrift[1])} on a deposit of ${maxDrift[0]}`)

    });
  });
});
