const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("StakedTLOS", function () {
  it("Should observe yield and deposit/withdraw successfully", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const WTLOS = await ethers.getContractFactory("WTLOS");
    const wtlos = await WTLOS.deploy();
    const StakedTLOS = await ethers.getContractFactory("StakedTLOS");
    const stlos = await StakedTLOS.deploy(wtlos.address);
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
    await stlos.withdrawTLOS(ethers.utils.parseEther("2.0"), owner.address, owner.address);

    console.log("Owner " + owner.address + " has balance of " + ethers.utils.formatEther(await stlos.provider.getBalance(owner.address)));
  });
});
