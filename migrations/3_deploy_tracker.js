const TOK = artifacts.require("TOK");
const ExpenseTracker = artifacts.require("ExpenseTracker");

module.exports = async (deployer) => {
  const tokenInstance = await TOK.deployed();

  await deployer.deploy(ExpenseTracker, tokenInstance.address);
};
