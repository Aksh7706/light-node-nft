import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { LeapLightNode } from "../typechain-types";

describe("LeapLightNode", function () {
  let owner: SignerWithAddress;
  let signer: SignerWithAddress;
  let whiteListed: SignerWithAddress;
  let signers: SignerWithAddress[];

  const stageMetadataURIs = [
    "ipfs://bafkreic34xb4dxakqblqw4o65vq55bp3gyh4zob25a4rgz7xwput7zehqm",
    "ipfs://bafkreiexiatuttauxjjfr6g5dqnoqomwisdaqjqyh7gktznyj3gure2adq",
    "ipfs://bafkreig47uuqono6ebthikjfwb7qxw34p55ukjvpo7paedmgqiftddghiy"
  ];

  let leapLightNode: LeapLightNode;

  // Helper function for creating signatures
  async function createMintSignature(to: SignerWithAddress) {
    const domain = {
      name: "LeapLightNode",
      version: "1.0",
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: await leapLightNode.getAddress()
    };

    const types = {
      Mint: [
        { name: "to", type: "address" }
      ]
    };

    const value = {
      to: to.address
    };

    return await signer.signTypedData(domain, types, value);
  }

  beforeEach(async function () {
    [owner, signer, whiteListed, ...signers] = await ethers.getSigners();

    const LeapLightNode = await ethers.getContractFactory(
      "LeapLightNode"
    );
    leapLightNode = await LeapLightNode.deploy(owner.address, signer.address, stageMetadataURIs) as LeapLightNode;
    await leapLightNode.waitForDeployment();
  });

  it("should return true for valid signature", async function () {
    const signature = await createMintSignature(whiteListed);
    // mint token - connect with whiteListed account since msg.sender must match the address in the signature
    await expect(
      leapLightNode.connect(whiteListed).safeMint(signature)
    ).to.be.not.reverted;

    // check token owner
    const tokenOwner = await leapLightNode.ownerOf(0);
    expect(tokenOwner).to.equal(whiteListed.address);
  });

  it("should not allow minting to an address that already has a token", async function () {
    const signature = await createMintSignature(whiteListed);
    await leapLightNode.connect(whiteListed).safeMint(signature);

    // Try to mint again to the same address
    await expect(
      leapLightNode.connect(whiteListed).safeMint(signature)
    ).to.be.revertedWith("Address has already minted an NFT");
  });

  it("should correctly return token stage", async function () {
    const signature = await createMintSignature(whiteListed);
    await leapLightNode.connect(whiteListed).safeMint(signature);

    // Check initial stage (should be STAGE_1 which is 0x01)
    const stage = await leapLightNode.getTokenStage(0);
    expect(stage).to.equal(1);
  });

  it("should update token stage and return correct metadata URI", async function () {
    const signature = await createMintSignature(whiteListed);
    await leapLightNode.connect(whiteListed).safeMint(signature);

    // Check initial metadata URI
    const initialUri = await leapLightNode.tokenURI(0);
    const stage = await leapLightNode.getTokenStage(0);
    expect(initialUri).to.equal(stageMetadataURIs[Number(stage) - 1]);

    // Update to stage 2
    const STAGE_2 = "0x02";
    await leapLightNode.connect(owner).updateTokenStage(0, STAGE_2);

    // Check updated stage
    const updatedStage = await leapLightNode.getTokenStage(0);
    expect(updatedStage).to.equal(STAGE_2);

    // Check updated metadata URI
    const updatedUri = await leapLightNode.tokenURI(0);
    expect(updatedUri).to.equal(stageMetadataURIs[Number(updatedStage) - 1]);
  });

  it("should batch update stages by address", async function () {
    // Mint tokens to multiple addresses
    const users = [whiteListed, signers[0], signers[1]];

    // Use the helper function instead of duplicating code
    for (const user of users) {
      const signature = await createMintSignature(user);
      await leapLightNode.connect(user).safeMint(signature);
    }

    // Batch update to stage 3
    const STAGE_3 = "0x03";
    const userAddresses = users.map(user => user.address);
    await leapLightNode.connect(owner).batchUpdateStagesByAddress(userAddresses, STAGE_3);

    // Check stages were updated
    for (let i = 0; i < users.length; i++) {
      const stage = await leapLightNode.getTokenStageByAddress(users[i].address);
      expect(stage).to.equal(STAGE_3);

      // Check metadata URI using the array instead of hardcoding
      const uri = await leapLightNode.tokenURI(i);
      expect(uri).to.equal(stageMetadataURIs[Number(stage) - 1]);
    }
  });

  it("should not allow token transfers (soulbound)", async function () {
    const signature = await createMintSignature(whiteListed);
    await leapLightNode.connect(whiteListed).safeMint(signature);

    // Try to transfer the token
    await expect(
      leapLightNode.connect(whiteListed).transferFrom(whiteListed.address, owner.address, 0)
    ).to.be.revertedWith("Soulbound: NFT cannot be transferred or burned");
  });

  it("should allow owner to update signer address", async function () {
    const newSigner = signers[0];
    await leapLightNode.connect(owner).setSignerAddress(newSigner.address);

    // Verify the signer was updated by creating a signature with the new signer
    // and using it to mint a token
    const domain = {
      name: "LeapLightNode",
      version: "1.0",
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: await leapLightNode.getAddress()
    };

    const types = {
      Mint: [
        { name: "to", type: "address" }
      ]
    };

    const value = {
      to: whiteListed.address
    };

    const signature = await newSigner.signTypedData(domain, types, value);

    // This should succeed if the signer address was properly updated
    await expect(
      leapLightNode.connect(whiteListed).safeMint(signature)
    ).to.be.not.reverted;

    // Try with the old signer, which should now fail
    const oldSignature = await signer.signTypedData(domain, types, value);
    await expect(
      leapLightNode.connect(signers[1]).safeMint(oldSignature)
    ).to.be.revertedWith("Invalid signer");
  });

  it("should allow owner to update stage metadata URI", async function () {
    const STAGE_1 = "0x01";
    const newUri = "ipfs://new-uri-for-stage-1";

    await leapLightNode.connect(owner).setStageMetadataURI(STAGE_1, newUri);

    const signature = await createMintSignature(whiteListed);
    await leapLightNode.connect(whiteListed).safeMint(signature);

    const tokenUri = await leapLightNode.tokenURI(0);
    expect(tokenUri).to.equal(newUri);
  });
});