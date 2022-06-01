// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const WTLOS = "0xaE85Bf723A9e74d6c663dd226996AC1b8d075AA9";

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const StakedTLOS = await hre.ethers.getContractFactory("StakedTLOS");
  const TelosEscrow = await hre.ethers.getContractFactory("TelosEscrow");

  const escrow = await TelosEscrow.deploy("0xc51fE232a0153F1F44572369Cefe7b90f2BA08a5", 200, 600); // Governance address, max locked tokens structs per address, lock duration
  await escrow.deployed();
  const stlos = await StakedTLOS.deploy(WTLOS, escrow.address);
  await stlos.deployed();

  console.log("Escrow deployed to:", escrow.address);
  console.log("STLOS deployed to:", stlos.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
