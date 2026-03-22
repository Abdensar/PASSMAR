const hre = require("hardhat");

async function main() {
  const signers = await hre.ethers.getSigners();
  const deployer = signers[0];
  if (!deployer) {
    throw new Error("Aucun compte configuré. Définissez DEPLOYER_PRIVATE_KEY ou lancez avec le réseau hardhat.");
  }

  console.log("Déploiement avec:", deployer.address);

  const Factory = await hre.ethers.getContractFactory("PassportRegistry");
  const registry = await Factory.connect(deployer).deploy();
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log("PassportRegistry déployé à:", address);
  console.log("Ajoutez CONTRACT_ADDRESS=" + address + " dans backend/.env");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
