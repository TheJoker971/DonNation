// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/// @title FidelityCard
/// @notice NFT soulbound de fidélité — un token par (utilisateur × association).
/// @dev Les points sont stockés dans le struct CardData, pas dans balanceOf ERC-721.
///      balanceOf(owner) = nombre de NFTs détenus (= nombre d'associations).
///      associationId est un bytes32 représentant un UUID (ex. abi.encodePacked(uuid)).
contract FidelityCard is Ownable, ERC721URIStorage {
    // ─── Types ───────────────────────────────────────────────────────────────

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

    struct CardData {
        uint256 tokenId;
        bytes32 associationId;
        uint256 balance; // points actuels disponibles
        uint256 totalEarned; // points cumulés depuis le mint
        CardType cardType;
    }

    // ─── Errors ───────────────────────────────────────────────────────────────

    error INSUFFICIENT_BALANCE(uint256 amount);
    error NON_TRANSFERABLE();
    error ALREADY_MINTED(bytes32 associationId);
    error NOT_MINTED(bytes32 associationId);
    error INVALID_ASSOCIATION_ID();

    // ─── Events ───────────────────────────────────────────────────────────────

    event Minted(uint256 indexed tokenId, address indexed owner, bytes32 indexed associationId, uint256 amount);
    event PointsAdded(uint256 indexed tokenId, address indexed owner, bytes32 indexed associationId, uint256 amount);
    event Burned(uint256 indexed tokenId, address indexed owner, bytes32 indexed associationId, uint256 amount);

    // ─── Storage ──────────────────────────────────────────────────────────────

    uint256 private _totalSupply;
    uint256 private _totalBurnedPoints;
    uint256 private _tokenIdCounter = 1;

    /// owner => associationId => card
    mapping(address => mapping(bytes32 => CardData)) private _cards;
    /// tokenId => owner  (lookup inverse pour setCardType)
    mapping(uint256 => address) private _tokenOwner;
    /// tokenId => associationId
    mapping(uint256 => bytes32) private _tokenAssociation;
    /// owner => liste des associationIds mintés
    mapping(address => bytes32[]) private _userAssociations;

    // ─── Constructor ─────────────────────────────────────────────────────────

    constructor(address initialOwner) Ownable(initialOwner) ERC721("FidelityCard", "FC") {}

    // ─── Soulbound ────────────────────────────────────────────────────────────

    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) revert NON_TRANSFERABLE();
        return super._update(to, tokenId, auth);
    }

    // ─── Write ────────────────────────────────────────────────────────────────

    /// @notice Mint une carte de fidélité pour `owner` liée à `associationId` (UUID encodé en bytes32).
    function mint(address owner, bytes32 associationId, uint256 amount, string memory uri) external onlyOwner {
        if (associationId == bytes32(0)) revert INVALID_ASSOCIATION_ID();
        if (_cards[owner][associationId].tokenId != 0) revert ALREADY_MINTED(associationId);

        uint256 id = _tokenIdCounter;
        _mint(owner, id);
        _setTokenURI(id, uri);

        _cards[owner][associationId] = CardData({
            tokenId: id, associationId: associationId, balance: amount, totalEarned: amount, cardType: CardType.WOOD
        });

        _tokenOwner[id] = owner;
        _tokenAssociation[id] = associationId;
        _userAssociations[owner].push(associationId);
        _totalSupply++;
        _tokenIdCounter++;

        emit Minted(id, owner, associationId, amount);
    }

    /// @notice Ajoute des points à la carte d'un utilisateur pour une association donnée.
    function addPoints(address owner, bytes32 associationId, uint256 amount) external onlyOwner {
        CardData storage card = _cards[owner][associationId];
        if (card.tokenId == 0) revert NOT_MINTED(associationId);

        card.balance += amount;
        card.totalEarned += amount;

        emit PointsAdded(card.tokenId, owner, associationId, amount);
    }

    /// @notice Brûle (dépense) des points sans brûler le NFT.
    function burn(address owner, bytes32 associationId, uint256 amount) external onlyOwner {
        CardData storage card = _cards[owner][associationId];
        if (card.tokenId == 0) revert NOT_MINTED(associationId);
        if (card.balance < amount) revert INSUFFICIENT_BALANCE(amount);

        card.balance -= amount;
        _totalBurnedPoints += amount;

        emit Burned(card.tokenId, owner, associationId, amount);
    }

    function setCardType(uint256 tokenId, CardType _cardType) external onlyOwner {
        bytes32 associationId = _tokenAssociation[tokenId];
        address owner = _tokenOwner[tokenId];
        _cards[owner][associationId].cardType = _cardType;
    }

    function setTokenURI(uint256 tokenId, string memory uri) external onlyOwner {
        _setTokenURI(tokenId, uri);
    }

    // ─── Read ─────────────────────────────────────────────────────────────────

    /// @notice Retourne toutes les données de la carte d'un utilisateur pour une association.
    function getCard(address owner, bytes32 associationId) external view returns (CardData memory) {
        return _cards[owner][associationId];
    }

    /// @notice Retourne la liste des associationIds pour lesquelles l'utilisateur a une carte.
    function getUserAssociations(address owner) external view returns (bytes32[] memory) {
        return _userAssociations[owner];
    }

    /// @notice Nombre total de NFTs mintés (toutes associations confondues).
    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    /// @notice Nombre total de points brûlés (toutes cartes confondues).
    function totalBurnedPoints() external view returns (uint256) {
        return _totalBurnedPoints;
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
