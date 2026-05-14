// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.13;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract FidelityCard is Ownable {
    string private _name;
    string private _symbol;
    string private _baseURI;

    /**
     * @notice Constructor
     * @param _address The address of the owner of the fidelity card contract
     * @param name_ The name of the fidelity card (name of the association)
     * @param symbol_ The symbol of the fidelity card (symbol of the association)
     * @param baseURI The base URI of the fidelity card (base URI of the association image)
     */
    constructor(address _address, string memory name_, string memory symbol_, string memory baseURI) Ownable(_address) {
        _name = name_;
        _symbol = symbol_;
        _baseURI = baseURI;
    }

    enum CardType {
        Wood,
        Metal,
        Bronze,
        Silver,
        Gold,
        Platinum,
        Diamond,
        Emerald
    }

    error NotEnoughPoints(uint256 _points);

    event Mint(address indexed _address, uint256 _points);
    event Burn(address indexed _address, uint256 _points);
    event AddPoints(address indexed _address, uint256 _points);
    event ChangeURI(string _uri);
    event ChangeCardType(uint256 indexed _tokenId, CardType _typeCard);

    mapping(address _address => uint256 _tokenId) private _tokenId;
    mapping(uint256 _tokenId => address _address) private _ownerOf;
    mapping(uint256 tokenId => uint256 points) private _points;
    mapping(uint256 tokenId => CardType typeCard) private _typeCard;

    uint256 tokenIdCounter = 1;
    uint256 private _totalSupply;

    function name() public view returns (string memory) {
        return _name;
    }

    function symbol() public view returns (string memory) {
        return _symbol;
    }

    /**
     * @notice Mint a new fidelity card
     * @param _address The address of the owner of the fidelity card
     * @param points The number of points to mint
     */
    function mint(address _address, uint256 points) public onlyOwner {
        if (_tokenId[_address] != 0) {
            _points[_tokenId[_address]] += points;
            emit AddPoints(_address, points);
        } else {
            _tokenId[_address] = tokenIdCounter;
            _ownerOf[tokenIdCounter] = _address;
            _points[tokenIdCounter] = points;
            _typeCard[tokenIdCounter] = CardType.Wood;
            tokenIdCounter++;
            _totalSupply++;
            emit Mint(_address, points);
        }
    }

    /**
     * @notice Get the balance of the fidelity card
     * @param _address The address of the owner of the fidelity card
     * @return The balance of the fidelity card
     */
    function getBalance(address _address) public view returns (uint256) {
        return _points[_tokenId[_address]];
    }

    /**
     * @notice Burn points from the fidelity card
     * @param _address The address of the owner of the fidelity card
     * @param points The number of points to burn
     */
    function burn(address _address, uint256 points) public onlyOwner {
        require(_points[_tokenId[_address]] >= points, NotEnoughPoints(points));
        _points[_tokenId[_address]] -= points;
        emit Burn(_address, points);
    }

    /**
     * @notice Change the base URI of the fidelity card
     * @param uri The new base URI of the fidelity card
     */
    function changeURI(string memory uri) public onlyOwner {
        _baseURI = uri;
        emit ChangeURI(uri);
    }

    /**
     * @notice Get the URI of the fidelity card
     * @return The URI of the fidelity card
     */
    function tokenURI(uint256) public view returns (string memory) {
        return _baseURI;
    }

    /**
     * @notice Get the token ID of the fidelity card
     * @param _address The address of the owner of the fidelity card
     * @return The token ID of the fidelity card
     */
    function getTokenId(address _address) public view returns (uint256) {
        return _tokenId[_address];
    }

    /**
     * @notice Get the total supply of the fidelity card
     * @return The total supply of the fidelity card
     */
    function totalSupply() public view returns (uint256) {
        return _totalSupply;
    }

    /**
     * @notice Get the card type of the fidelity card
     * @param _address The address of the owner of the fidelity card
     * @return The card type of the fidelity card
     */
    function getCardType(address _address) public view returns (CardType) {
        return _typeCard[_tokenId[_address]];
    }

    /**
     * @notice Change the card type of the fidelity card
     * @param _address The address of the owner of the fidelity card
     * @param typeCard The new card type of the fidelity card
     */
    function changeCardType(address _address, CardType typeCard) public onlyOwner {
        _typeCard[_tokenId[_address]] = typeCard;
        emit ChangeCardType(_tokenId[_address], typeCard);
    }

    /**
     * @notice Get the owner of the fidelity card
     * @param tokenId The token ID of the fidelity card
     * @return The owner of the fidelity card
     */
    function ownerOf(uint256 tokenId) external view returns (address) {
        return _ownerOf[tokenId];
    }
}
