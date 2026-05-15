// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract FidelityCard is Ownable, ERC721URIStorage {
    // Enums
    enum CardType {
        WOOD,
        STEEL,
        BRONZE,
        SILVER,
        GOLD,
        PLATINUM,
        DIAMOND,
        OBSIDIAN
    }

    constructor(address _owner) Ownable(_owner) ERC721("FidelityCard", "FC") {}

    uint256 private _totalSupply;
    uint256 private _totalBurned;
    uint256 private tokenIdCounter = 1;

    // Mappings
    mapping(address owner => uint256 balance) private _balances;
    mapping(address owner => uint256 tokenId) private _tokenIds;
    mapping(address owner => bool) private _isMinted;
    mapping(uint256 tokenId => CardType cardType) private _cardTypes;
    mapping(address owner => uint256 amount) private _totalEarned;

    // Events
    event Minted(uint256 indexed tokenId, address indexed owner, uint256 amount);
    event Burned(uint256 indexed tokenId, address indexed owner, uint256 amount);
    event PointsAdded(uint256 indexed tokenId, address indexed owner, uint256 amount);

    // Errors
    error INSUFFICIENT_BALANCE(uint256 amount);
    error NON_TRANSFERABLE();
    error ALREADY_MINTED();
    error NOT_MINTED();

    /// @dev Soulbound : pas de transfert de jeton (les points restent gérés uniquement par `mint` / `burn`).
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) {
            revert NON_TRANSFERABLE();
        }
        return super._update(to, tokenId, auth);
    }

    // Getters & Setters
    function cardType(uint256 _tokenId) external view returns (CardType) {
        return _cardTypes[_tokenId];
    }

    function getTokenId(address owner) external view returns (uint256) {
        return _tokenIds[owner];
    }

    function isMinted(address owner) external view returns (bool) {
        return _isMinted[owner];
    }

    function totalEarned(address owner) external view returns (uint256) {
        return _totalEarned[owner];
    }

    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    function totalBurned() external view returns (uint256) {
        return _totalBurned;
    }

    function balanceOf(address owner) public view override(ERC721, IERC721) returns (uint256) {
        return _balances[owner];
    }

    function setTokenURI(uint256 _tokenId, string memory uri) external onlyOwner {
        _setTokenURI(_tokenId, uri);
    }

    function setCardType(uint256 _tokenId, CardType _cardType) external onlyOwner {
        _cardTypes[_tokenId] = _cardType;
    }

    // Functions
    function mint(address owner, uint256 amount, string memory uri) external onlyOwner {
        if (_isMinted[owner]) revert ALREADY_MINTED();
        uint256 id = tokenIdCounter;
        _mint(owner, id);
        _balances[owner] += amount;
        _totalEarned[owner] += amount;
        _isMinted[owner] = true;
        _tokenIds[owner] = id;
        _cardTypes[id] = CardType.WOOD;
        _setTokenURI(id, uri);
        _totalSupply++;
        emit Minted(id, owner, amount);
        tokenIdCounter++;
    }

    function addPoints(address owner, uint256 amount) external onlyOwner {
        if (!_isMinted[owner]) revert NOT_MINTED();
        _balances[owner] += amount;
        _totalEarned[owner] += amount;
        emit PointsAdded(_tokenIds[owner], owner, amount);
    }

    function burn(address owner, uint256 amount) external onlyOwner {
        require(_balances[owner] >= amount, INSUFFICIENT_BALANCE(amount));
        _balances[owner] -= amount;
        _totalBurned += amount;
        emit Burned(_tokenIds[owner], owner, amount);
    }
}
