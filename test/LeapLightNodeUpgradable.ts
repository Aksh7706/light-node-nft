import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { LumiERC721 } from "../typechain-types";
import { STAGE_METADATA } from "../constants";
describe("LumiERC721", function () {
  let owner: SignerWithAddress;
  let signer: SignerWithAddress;
  let whiteListed: SignerWithAddress;
  let whiteListed2: SignerWithAddress;
  let whiteListed3: SignerWithAddress;

  const stageMetadata = STAGE_METADATA;

  let lumiERC721: LumiERC721;

  // Helper function for creating signatures
  async function createMintSignature(to: SignerWithAddress, stage: string = "0x01") {
    const domain = {
      name: "LumiERC721",
      version: "1.0",
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: await lumiERC721.getAddress()
    };

    const types = {
      Mint: [
        { name: "to", type: "address" },
        { name: "stage", type: "bytes1" }
      ]
    };

    const value = {
      to: to.address,
      stage: stage
    };

    return await signer.signTypedData(domain, types, value);
  }

  // Changed from beforeEach to before to run setup once for all tests
  before(async function () {
    [owner, signer, whiteListed, whiteListed2, whiteListed3] = await ethers.getSigners();
    const LumiERC721 = await ethers.getContractFactory(
      "LumiERC721"
    );

    lumiERC721 = await upgrades.deployProxy(
      LumiERC721,
      [owner.address, signer.address, stageMetadata],
      {
        kind: 'uups',
        initializer: 'initialize'
      }
    );
    await lumiERC721.waitForDeployment();
  });

  it("should successfully mint with valid signature", async function () {
    const stage = "0x01";
    const signature = await createMintSignature(whiteListed, stage);

    const tx = await lumiERC721.connect(whiteListed).safeMint(whiteListed.address, stage, signature);
    await tx.wait();

    const tokenOwner = await lumiERC721.ownerOf(0);
    expect(tokenOwner).to.equal(whiteListed.address);
  });

  it("should not allow minting to an address that already has a token", async function () {
    const stage = "0x01";
    const signature = await createMintSignature(whiteListed, stage);
    await expect(lumiERC721.connect(whiteListed).safeMint(whiteListed.address, stage, signature)).to.be.revertedWith("Address has already minted an NFT");
  });

  it("should not allow minting with invalid stage", async function () {
    const invalidStage = "0x04"; // Only 0x01, 0x02, 0x03 are valid
    const signature = await createMintSignature(whiteListed3, invalidStage);

    await expect(
      lumiERC721.connect(whiteListed3).safeMint(whiteListed3.address, invalidStage, signature)
    ).to.be.revertedWith("Invalid stage");
  });

  it("should not allow minting with signature for different address", async function () {
    const stage = "0x01";
    // Create signature for whiteListed3
    const signature = await createMintSignature(whiteListed3, stage);

    // Try to use that signature to mint to a different address
    await expect(
      lumiERC721.connect(whiteListed3).safeMint(owner.address, stage, signature)
    ).to.be.revertedWith("Invalid signer");
  });

  it("should correctly return token stage", async function () {
    const stage = await lumiERC721.getTokenStage(0);
    expect(stage).to.equal(1);
  });

  it("should update token stage and return correct metadata URI", async function () {
    // Check initial metadata URI
    const initialUri = await lumiERC721.tokenURI(0);
    const stage = await lumiERC721.getTokenStage(0);

    // Decode base64 URI and compare with original metadata
    const base64Data = initialUri.split(',')[1];
    const decodedInitialUri = Buffer.from(base64Data, 'base64').toString();
    expect(JSON.parse(decodedInitialUri)).to.deep.equal(JSON.parse(stageMetadata[Number(stage) - 1]));

    // Update to stage 2
    const STAGE_2 = "0x02";
    const tx = await lumiERC721.connect(owner).updateTokenStage(0, STAGE_2);
    await tx.wait();

    // Check updated stage
    const updatedStage = await lumiERC721.getTokenStage(0);
    expect(updatedStage).to.equal(STAGE_2);

    // Check updated metadata URI
    const updatedUri = await lumiERC721.tokenURI(0);
    const updatedBase64Data = updatedUri.split(',')[1];
    const decodedUpdatedUri = Buffer.from(updatedBase64Data, 'base64').toString();
    expect(JSON.parse(decodedUpdatedUri)).to.deep.equal(JSON.parse(stageMetadata[Number(updatedStage) - 1]));
  });

  it("should batch update stages by address", async function () {
    const stage = "0x01";
    const signature = await createMintSignature(owner, stage);

    const tx = await lumiERC721.connect(owner).safeMint(owner.address, stage, signature);
    await tx.wait();

    const users = [whiteListed, owner];

    // Batch update to stage 3
    const STAGE_3 = "0x03";
    const userAddresses = users.map(user => user.address);
    const txUpdate = await lumiERC721.connect(owner).batchUpdateStagesByAddress(userAddresses, STAGE_3);
    await txUpdate.wait();

    // Check stages were updated
    for (let i = 0; i < users.length; i++) {
      const stage = await lumiERC721.getTokenStageByAddress(users[i].address);
      expect(stage).to.equal(STAGE_3);

      // Check metadata URI
      const uri = await lumiERC721.tokenURI(i);
      const base64Data = uri.split(',')[1];
      const decodedUri = Buffer.from(base64Data, 'base64').toString();
      expect(JSON.parse(decodedUri)).to.deep.equal(JSON.parse(stageMetadata[Number(stage) - 1]));
    }
  });

  it("should not allow token transfers (soulbound)", async function () {
    await expect(
      lumiERC721.connect(whiteListed).transferFrom(whiteListed.address, owner.address, 0)
    ).to.be.revertedWith("Soulbound: NFT cannot be transferred or burned");
  });

  it("should allow owner to update signer address", async function () {
    const newSigner = whiteListed;
    const tx = await lumiERC721.connect(owner).setSignerAddress(newSigner.address);
    await tx.wait();

    // Verify the signer was updated by creating a signature with the new signer
    // and using it to mint a token
    const domain = {
      name: "LumiERC721",
      version: "1.0",
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: await lumiERC721.getAddress()
    };

    const types = {
      Mint: [
        { name: "to", type: "address" },
        { name: "stage", type: "bytes1" }
      ]
    };

    const stage = "0x01";
    const value = {
      to: whiteListed2.address,
      stage: stage
    };

    const signature = await newSigner.signTypedData(domain, types, value);

    // This should succeed if the signer address was properly updated
    const txMint = await lumiERC721.connect(whiteListed2).safeMint(whiteListed2.address, stage, signature);
    await txMint.wait();

    const tokenId = await lumiERC721.tokenOfOwnerByIndex(whiteListed2.address, 0);
    expect(tokenId).to.equal(2);

    const totalSupply = await lumiERC721.totalSupply();
    expect(totalSupply).to.equal(3);

    // Try with the old signer, which should now fail
    const oldSignature = await signer.signTypedData(domain, types, {
      to: whiteListed3.address,
      stage: stage
    });

    await expect(
      lumiERC721.connect(whiteListed3).safeMint(whiteListed3.address, stage, oldSignature)
    ).to.be.revertedWith("Invalid signer");
  });

  it("should allow owner to update stage metadata URI", async function () {
    const STAGE_1 = "0x01";
    const newUri = `{
"description": "Leap Light Node Updated",
"image": "ipfs://new-uri",
"name": "Leap Light Node Updated",
"attributes": [{ "trait_type": "Stage_Updated", "value": "1" }]
}`;

    const tx = await lumiERC721.connect(owner).setStageMetadata(STAGE_1, newUri);
    await tx.wait();

    const txUpdate = await lumiERC721.connect(owner).updateTokenStage(0, STAGE_1);
    await txUpdate.wait();

    const tokenUri = await lumiERC721.tokenURI(0);
    const base64Data = tokenUri.split(',')[1];
    const decodedUri = Buffer.from(base64Data, 'base64').toString();
    expect(JSON.parse(decodedUri)).to.deep.equal(JSON.parse(newUri));
  });
});