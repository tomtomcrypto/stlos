module.exports = async ({
  getNamedAccounts,
  deployments,
  getChainId,
  getUnnamedAccounts,
}) => {
  const {deploy} = deployments;

  // the following will only deploy "GenericMetaTxProcessor" if the contract was never deployed or if the code changed since last deployment
  await deploy('StakedTLOS', {
    from: "0x87ef69a835f8cd0c44ab99b7609a20b2ca7f1c8470af4f0e5b44db927d542084",
    gasLimit: 4000000,
    args: ["0xaE85Bf723A9e74d6c663dd226996AC1b8d075AA9"],
  });
};
