// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const LeapLightNodeModule = buildModule("LeapLightNodeModule", (m) => {
  // Deploy the LeapLightNode contract with required constructor parameters:
  // 1. initialOwner - The address that will own the contract
  // 2. signerAddress - The address that will sign mint requests

  const stageMetadataURIs = [
    "ipfs://bafkreic34xb4dxakqblqw4o65vq55bp3gyh4zob25a4rgz7xwput7zehqm",
    "ipfs://bafkreiexiatuttauxjjfr6g5dqnoqomwisdaqjqyh7gktznyj3gure2adq",
    "ipfs://bafkreig47uuqono6ebthikjfwb7qxw34p55ukjvpo7paedmgqiftddghiy"
  ];

  const leapLightNode = m.contract("LeapLightNode", [
    m.getAccount(0), // Using the first account as the initial owner
    m.getAccount(1), // Using the second account as the signer address
    stageMetadataURIs
  ]);

  return { leapLightNode };
});

export default LeapLightNodeModule;

