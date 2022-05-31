const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("StakedTLOS", function () {
  it("Should observe yield and deposit/withdraw successfully", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const WTLOS = await ethers.getContractFactory("WTLOS");
    const wtlos = await WTLOS.deploy();
    const EscrowTLOS = await ethers.getContractFactory("TelosEscrow");
    const escrow = await EscrowTLOS.deploy("TelosEscrow", "0xe7209d65c5BB05Ddf799b20fF0EC09E691FC3f11", 25, 60);
    const StakedTLOS = await ethers.getContractFactory("StakedTLOS");
    const stlos = await StakedTLOS.deploy(wtlos.address, escrow.address);
    await stlos.asset();

    console.log("Owner " + owner.address + " has balance of " + ethers.utils.formatEther(await stlos.provider.getBalance(owner.address)));
    await stlos.depositTLOS({value: ethers.utils.parseEther("1.0")});
    expect(await stlos.balanceOf(owner.address)).to.equal(ethers.utils.parseEther("1.0"));
    expect(await stlos.maxWithdraw(owner.address)).to.equal(ethers.utils.parseEther("1.0"));

    await owner.sendTransaction({
      to: stlos.address,
      value: ethers.utils.parseEther("1.0"), // Sends exactly 1.0 ether
    });

    console.log("Owner " + owner.address + " has balance of " + ethers.utils.formatEther(await stlos.provider.getBalance(owner.address)));
    expect(await stlos.balanceOf(owner.address)).to.equal(ethers.utils.parseEther("1.0"));
    expect(await stlos.maxWithdraw(owner.address)).to.equal(ethers.utils.parseEther("2.0"));
    await stlos.withdraw(ethers.utils.parseEther("2.0"), owner.address, owner.address);

    console.log("Owner " + owner.address + " has balance of " + ethers.utils.formatEther(await stlos.provider.getBalance(owner.address)));
  });
});
