import { ethers, upgrades } from "hardhat";

async function main() {
  const [deployer, signer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Signer address:", signer.address);

  // Define stage metadata
  const stageMetadata = [
    `{
"description": "Leap Light Node",
"image": "ipfs://bafkreih7wsarzz47ejfeatkk66e6xvpli7blqle2fnl26zk66bhicflboa",
"name": "Leap Light Node",
"attributes": [{ "trait_type": "Stage", "value": "1" }]
}`,
    `{
"description": "Leap Light Node",
"image": "ipfs://bafkreidwlupbssogm4lwgacqmdhcsr4jkrtxfbfsznodkq5povhs3gqfxa",
"name": "Leap Light Node",
"attributes": [{ "trait_type": "Stage", "value": "2" }]
}`,
    `{
"description": "Leap Light Node",
"image": "ipfs://bafkreiha2ugq5dvhebc2n2owiljl6ygkncnejms4o26fexnae7ldfpm5um",
"name": "Leap Light Node",
"attributes": [{ "trait_type": "Stage", "value": "3" }]
}`
  ];

  // Get the contract factory
  const LeapLightNode = await ethers.getContractFactory("LeapLightNode");

  console.log("Deploying LeapLightNode...");

  // Deploy the contract as a proxy
  const leapLightNode = await upgrades.deployProxy(
    LeapLightNode,
    [deployer.address, signer.address, stageMetadata],
    {
      kind: 'uups',
      initializer: 'initialize'
    }
  );

  await leapLightNode.waitForDeployment();

  const contractAddress = await leapLightNode.getAddress();
  console.log("LeapLightNode deployed to:", contractAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });