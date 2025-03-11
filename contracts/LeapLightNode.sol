// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.22;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

contract LeapLightNode is ERC721, ERC721Enumerable, Ownable, EIP712 {
    uint256 private _nextTokenId;
    address private _signerAddress;
    
    // Add mapping for token stages
    mapping(uint256 => bytes1) private _tokenStages;
    
    // Constants for stages
    bytes1 private immutable STAGE_1;
    bytes1 private immutable STAGE_2;
    bytes1 private immutable STAGE_3;

    // Metadata URIs for different stages
    mapping(bytes1 => string) private _stageMetadataURIs;

    bytes32 private constant MINT_TYPEHASH = keccak256("Mint(address to)");

    // Events for important state changes
    event TokenStageUpdated(uint256 indexed tokenId, bytes1 stage);
    event SignerAddressUpdated(address indexed oldSigner, address indexed newSigner);
    event StageMetadataURIUpdated(bytes1 indexed stage, string uri);

    constructor(
        address initialOwner,
        address signerAddress,
        string[] memory stageURIs
    )
        ERC721("LeapLightNode", "LLN")
        EIP712("LeapLightNode", "1.0")
        Ownable(initialOwner)
    {
        require(signerAddress != address(0), "Signer cannot be zero address");
        require(stageURIs.length == 3, "Must provide exactly 3 stage URIs");
        
        _signerAddress = signerAddress;

        // Set stage constants
        STAGE_1 = 0x01;
        STAGE_2 = 0x02;
        STAGE_3 = 0x03;
        
        // Set metadata URI for each stage from the array
        for (uint8 i = 0; i < stageURIs.length; i++) {
            require(bytes(stageURIs[i]).length > 0, "Stage URI cannot be empty");
            _stageMetadataURIs[bytes1(i + 1)] = stageURIs[i];
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

    function safeMint(bytes memory signature) validateMintRequest(msg.sender) public {
        uint256 tokenId = _nextTokenId++;
        bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(MINT_TYPEHASH, msg.sender)));
        address signer = ECDSA.recover(digest, signature);
        require(signer == _signerAddress, "Invalid signer");
        _safeMint(msg.sender, tokenId);
        _tokenStages[tokenId] = STAGE_1;
    }

    // The following functions are overrides required by Solidity.
    function _increaseBalance(address account, uint128 value) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
    
    // The following function override to make the NFT non-transferrable
    function _update(address to, uint256 tokenId, address auth) internal override(ERC721, ERC721Enumerable) returns (address) {
        address from = _ownerOf(tokenId);
        // Only allow initial minting (from zero address)
        // Prevent all transfers (including burning)
        require(from == address(0), "Soulbound: NFT cannot be transferred or burned");
        return super._update(to, tokenId, auth);
    }

    // Override tokenURI to return stage-specific metadata
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        bytes1 stage = _tokenStages[tokenId];
        return _stageMetadataURIs[stage];
    }

    // Admin functions
    // 1. Update signer address
    function setSignerAddress(address signerAddress) external onlyOwner {
        require(signerAddress != address(0), "Cannot set signer to zero address");
        address oldSigner = _signerAddress;
        _signerAddress = signerAddress;
        emit SignerAddressUpdated(oldSigner, signerAddress);
    }

 
    // 2. Update stage metadata URI
    function setStageMetadataURI(bytes1 stage, string calldata uri) external onlyOwner validateStage(stage) {
        _stageMetadataURIs[stage] = uri;
        emit StageMetadataURIUpdated(stage, uri);
    }
    
    // 3. Update token stage
    function updateTokenStage(uint256 tokenId, bytes1 stage) external onlyOwner validateStage(stage) {
        _requireOwned(tokenId);
        _tokenStages[tokenId] = stage;
        emit TokenStageUpdated(tokenId, stage);
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
}