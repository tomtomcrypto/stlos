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
    args: [WTLOS, TelosEscrow.address],
  });

  console.log("StakedTLOS deployed to:", StakedTLOS.address);
  console.log("TelosEscrow deployed to:", TelosEscrow.address);
};
