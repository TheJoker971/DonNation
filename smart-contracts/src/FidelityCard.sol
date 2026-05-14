// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.13;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract FidelityCard is Ownable{
    string public name;
    string public symbol;
    string public baseURI;
    
    /**
     * @notice Constructor
     * @param _address The address of the owner of the fidelity card contract
     * @param _name The name of the fidelity card (name of the association)
     * @param _symbol The symbol of the fidelity card (symbol of the association)
     * @param _baseURI The base URI of the fidelity card (base URI of the association image)
     */
    constructor(address _address,string memory _name, string memory _symbol, string memory _baseURI) Ownable(_address){
        name = _name;
        symbol = _symbol;
        baseURI = _baseURI;
    }

    error NotEnoughPoints(uint256 _points);
    
    event Mint(address indexed _address, uint256 _points);
    event Burn(address indexed _address, uint256 _points);
    event AddPoints(address indexed _address, uint256 _points);
    event ChangeURI(address indexed _address, string _uri);

    mapping(address _address => uint256 _tokenId) private tokenId;
    mapping(uint256 tokenId => uint256 points) private points;
    mapping(uint256 tokenId => string uri) private uri;

    uint256 tokenIdCounter = 1;
    uint256 public totalSupply;

    /**
     * @notice Mint a new fidelity card
     * @param _address The address of the owner of the fidelity card
     * @param _points The number of points to mint
     */
    function mint(address _address, uint256 _points) public onlyOwner {
        if (tokenId[_address] != 0) {
            points[tokenId[_address]] += _points;
            emit AddPoints(_address, _points);
        } else {
            tokenId[_address] = tokenIdCounter;
            points[tokenIdCounter] = _points;
            tokenIdCounter++;
            totalSupply++;
            emit Mint(_address, 0);
        }
    }

    /**
     * @notice Get the balance of the fidelity card
     * @param _address The address of the owner of the fidelity card
     * @return The balance of the fidelity card
     */
    function getBalance(address _address) public view returns (uint256) {
        return points[tokenId[_address]];
    }

    /**
     * @notice Get the points of the fidelity card
     * @param _tokenId The token ID of the fidelity card
     * @return The points of the fidelity card
     */
    function getPoints(uint256 _tokenId) public view returns (uint256) {
        return points[_tokenId];
    }

    /**
     * @notice Burn points from the fidelity card
     * @param _address The address of the owner of the fidelity card
     * @param _points The number of points to burn
     */
    function burn(address _address, uint256 _points) public onlyOwner {
        require(points[tokenId[_address]] >= _points, NotEnoughPoints(_points));
        points[tokenId[_address]] -= _points;
        emit Burn(_address, _points);
    }

    /**
     * @notice Change the URI of the fidelity card
     * @param _address The address of the owner of the fidelity card
     * @param _uri The new URI of the fidelity card
     */
    function changeURI(address _address, string memory _uri) public onlyOwner {
        uri[tokenId[_address]] = _uri;
        emit ChangeURI(_address, _uri);
    }

    /**
     * @notice Get the URI of the fidelity card
     * @param _tokenId The token ID of the fidelity card
     * @return The URI of the fidelity card
     */
    function getURI(uint256 _tokenId) public view returns (string memory) {
        return uri[_tokenId];
    }

    /**
     * @notice Get the token ID of the fidelity card
     * @param _address The address of the owner of the fidelity card
     * @return The token ID of the fidelity card
     */
    function getTokenId(address _address) public view returns (uint256) {
        return tokenId[_address];
    }

    /**
     * @notice Get the total supply of the fidelity card
     * @return The total supply of the fidelity card
     */
    function getTotalSupply() public view returns (uint256) {
        return totalSupply;
    }

}