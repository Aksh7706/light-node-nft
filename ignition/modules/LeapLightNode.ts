// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const LeapLightNodeModule = buildModule("LeapLightNodeModule", (m) => {
  // Deploy the LeapLightNode contract with required constructor parameters:
  // 1. initialOwner - The address that will own the contract
  // 2. signerAddress - The address that will sign mint requests

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
}`,
  ];

  const leapLightNode = m.contract("LeapLightNode", [
    m.getAccount(0), // Using the first account as the initial owner
    m.getAccount(1), // Using the second account as the signer address
    stageMetadata
  ]);

  return { leapLightNode };
});

export default LeapLightNodeModule;
