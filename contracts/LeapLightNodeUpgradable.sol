// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.24;

import { ContractMetadata } from "@forma-dev/sdk/contracts/metadata/ContractMetadata.sol";
import {
    ContractMetadataUpgradeable
} from "@forma-dev/sdk/contracts/upgradeable/metadata/ContractMetadataUpgradeable.sol";
import { ERC721UpdatableUpgradeable } from "@forma-dev/sdk/contracts/upgradeable/token/ERC721/ERC721UpdatableUpgradeable.sol";
import { ERC721BaseUpgradeable } from "@forma-dev/sdk/contracts/upgradeable/token/ERC721/ERC721BaseUpgradeable.sol";
import {
    ERC721Upgradeable as ERC721UpgradeableOZ
} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";

import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { ERC721EnumerableUpgradeable } from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";

contract LumiERC721 is Initializable, ERC721UpdatableUpgradeable, ERC721EnumerableUpgradeable, OwnableUpgradeable, ContractMetadataUpgradeable, EIP712Upgradeable, UUPSUpgradeable {
    uint256 private _nextTokenId;
    address private _signerAddress;

    // Add mapping for token stages
    mapping(uint256 => bytes1) private _tokenStages;

    // Constants for stages
    bytes1 private constant STAGE_1 = 0x01;
    bytes1 private constant STAGE_2 = 0x02;
    bytes1 private constant STAGE_3 = 0x03;

    bytes32 private constant MINT_TYPEHASH = keccak256("Mint(address to,bytes1 stage)");

    // Events for important state changes
    event TokenStageUpdated(uint256 indexed tokenId, bytes1 stage);
    event SignerAddressUpdated(address indexed oldSigner, address indexed newSigner);
    event StageMetadataUpdated(bytes1 indexed stage, string metadata);


    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address initialOwner,
        address signerAddress,
        string[] memory stageMetadata
    ) public initializer {
        __ERC721_init("Lumi", "LUMI");
        __ERC721Enumerable_init();
        __Ownable_init(initialOwner);
        __ContractMetadata_init("Lumi");
        __EIP712_init("LumiERC721", "1.0");
        __UUPSUpgradeable_init();
     
        require(signerAddress != address(0), "Signer cannot be zero address");
        require(stageMetadata.length == 3, "Must provide exactly 3 stage metadata blobs");

        _signerAddress = signerAddress;

        // Set metadata for each stage from the array
        for (uint8 i = 0; i < stageMetadata.length; i++) {
            require(bytes(stageMetadata[i]).length > 0, "Stage metadata cannot be empty");
            _setTokenMetadataForced(_getTokenMetadataKey(bytes1(i + 1)), stageMetadata[i]);
        }
    }

    modifier validateMintRequest(address to) {
        require(to != address(0), "Cannot mint to zero address");
        require(balanceOf(to) == 0, "Address has already minted an NFT");
        _;
    }

    modifier validateStage(bytes1 stage) {
        require(stage == STAGE_1 || stage == STAGE_2 || stage == STAGE_3, "Invalid stage");
        _;
    }

    function safeMint(address to, bytes1 stage, bytes memory signature) validateMintRequest(to) validateStage(stage) public {
        uint256 tokenId = _nextTokenId++;
        bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(MINT_TYPEHASH, to, stage)));
        address signer = ECDSA.recover(digest, signature);
        require(signer == _signerAddress, "Invalid signer");
        _safeMint(to, tokenId);
        _tokenStages[tokenId] = stage;
        emit TokenStageUpdated(tokenId, stage);
    }

    // The following function override to make the NFT non-transferrable
    function _update(address to, uint256 tokenId, address auth) internal override(ERC721UpgradeableOZ, ERC721EnumerableUpgradeable) returns (address) {
        address from = _ownerOf(tokenId);
        // Only allow initial minting (from zero address)
        // Prevent all transfers (including burning)
        require(from == address(0), "Soulbound: NFT cannot be transferred or burned");
        return super._update(to, tokenId, auth);
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyOwner
    {}

    // Admin functions
    // 1. Update signer address
    function setSignerAddress(address signerAddress) external onlyOwner {
        require(signerAddress != address(0), "Cannot set signer to zero address");
        address oldSigner = _signerAddress;
        _signerAddress = signerAddress;
        emit SignerAddressUpdated(oldSigner, signerAddress);
    }

    // 2. Update stage metadata
    function setStageMetadata(bytes1 stage, string calldata metadata) external onlyOwner validateStage(stage) {
        _setTokenMetadataForced(_getTokenMetadataKey(stage), metadata);
        emit StageMetadataUpdated(stage, metadata);
    }

    // 3. Update token stage
    function updateTokenStage(uint256 tokenId, bytes1 stage) external onlyOwner validateStage(stage) {
        _requireOwned(tokenId);
        _tokenStages[tokenId] = stage;
        emit TokenStageUpdated(tokenId, stage);
        emit MetadataUpdate(tokenId);
    }

    // 4. Batch update token stage
    function batchUpdateStagesByAddress(
        address[] calldata users, 
        bytes1 stage
    ) external onlyOwner {
        for (uint256 i = 0; i < users.length; i++) {
            address user = users[i];
            uint256 balance = balanceOf(user);
            if (balance == 0) continue; // Skip if user doesn't own any tokens

            // Since this is a soulbound token and users can only have one token,
            // we can get their token using the tokenOfOwnerByIndex function
            uint256 tokenId = tokenOfOwnerByIndex(user, 0);
            _tokenStages[tokenId] = stage;
            emit TokenStageUpdated(tokenId, stage);
            emit MetadataUpdate(tokenId);
        }
    }

    // Public functions
    // Check the stage of a token
    function getTokenStage(uint256 tokenId) public view returns (uint8) {
        _requireOwned(tokenId);
        return uint8(_tokenStages[tokenId]);
    }

    // Check the stage of a token by address
    function getTokenStageByAddress(address user) public view returns (uint8) {
        uint256 balance = balanceOf(user);
        require(balance > 0, "Address does not own any tokens");
        uint256 tokenId = tokenOfOwnerByIndex(user, 0);
        return uint8(_tokenStages[tokenId]);
    }

    // The following functions are overrides required by Solidity.
    function _increaseBalance(address account, uint128 value) internal override(ERC721UpgradeableOZ, ERC721EnumerableUpgradeable) {
        super._increaseBalance(account, value);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721BaseUpgradeable, ERC721EnumerableUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721UpgradeableOZ, ERC721UpdatableUpgradeable) returns (string memory) {
        return _uri(tokenId);
    }

    function _getTokenMetadataKey(uint256 tokenId) internal view override returns (bytes32) {
        return _getTokenMetadataKey(_tokenStages[tokenId]);
    }

    function _getTokenMetadataKey(bytes1 stage) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("LumiERC721", stage));
    }

    function name() public view override(ERC721UpgradeableOZ, ContractMetadata) returns (string memory) {
        return ContractMetadata.name();
    }

    /// @dev Returns whether contract metadata can be set in the given execution context.
    function _canSetContractMetadata() internal view override returns (bool) {
        return owner() == _msgSender();
    }

    /// @dev Returns whether token metadata can be set in the given execution context.
    function _canSetTokenMetadata(uint256) internal view override returns (bool) {
        return owner() == _msgSender();
    }
}