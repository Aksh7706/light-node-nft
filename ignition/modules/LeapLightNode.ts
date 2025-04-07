// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const LeapLightNodeV0Module = buildModule("LeapLightNodeV0Module", (m) => {
 
    // Consider compressing the metadata or moving it to a separate file
    const stageMetadata = [
        `{"description":"Leap Light Node","image":"ipfs://bafkreih7wsarzz47ejfeatkk66e6xvpli7blqle2fnl26zk66bhicflboa","name":"Leap Light Node","attributes":[{"trait_type":"Stage","value":"1"}]}`,
        `{"description":"Leap Light Node","image":"ipfs://bafkreidwlupbssogm4lwgacqmdhcsr4jkrtxfbfsznodkq5povhs3gqfxa","name":"Leap Light Node","attributes":[{"trait_type":"Stage","value":"2"}]}`,
        `{"description":"Leap Light Node","image":"ipfs://bafkreiha2ugq5dvhebc2n2owiljl6ygkncnejms4o26fexnae7ldfpm5um","name":"Leap Light Node","attributes":[{"trait_type":"Stage","value":"3"}]}`,
    ];
    
    const leapLightNodeV0 = m.contract("LeapLightNodeV0", [
        m.getAccount(0),
        m.getAccount(1),
        stageMetadata,
    ]);

    return { leapLightNodeV0 };
});

export default LeapLightNodeV0Module;

// Run this command to deploy the module to the sketchpad network
// npx hardhat ignition deploy ./ignition/modules/LeapLightNode.ts --network sketchpad