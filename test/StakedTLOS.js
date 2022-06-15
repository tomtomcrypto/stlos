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
  });
});
