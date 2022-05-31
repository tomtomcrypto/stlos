// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const contract = await hre.ethers.getContractFactory("StakedTLOS");
  const sTLOS = await contract.deploy('0xaE85Bf723A9e74d6c663dd226996AC1b8d075AA9', "0x225C99704a1265086b002941882D833bBEF6F376");

  await sTLOS.deployed();
  console.log("sTLOS deployed to:", sTLOS.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
