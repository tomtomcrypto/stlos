module.exports = async ({getNamedAccounts, deployments}) => {
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();
  const WTLOS = "0xaE85Bf723A9e74d6c663dd226996AC1b8d075AA9";

  const TelosEscrow = await deploy('TelosEscrow', {
    from: deployer,
    args: [200, 600],
  });
  const StakedTLOS = await deploy('StakedTLOS', {
    from: deployer,
    args: [WTLOS, TelosEscrow.address, "0x7c56101c01eaaece3d1bb330910c8e9183b39dbd"],
  });

  console.log("StakedTLOS deployed to:", StakedTLOS.address);
  console.log("TelosEscrow deployed to:", TelosEscrow.address);
};
