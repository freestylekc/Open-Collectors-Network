pragma solidity ^0.4.19;

import "openzeppelin-solidity/contracts/crowdsale/Crowdsale.sol";
import 'openzeppelin-solidity/contracts/lifecycle/Pausable.sol';
import "openzeppelin-solidity/contracts/crowdsale/validation/WhitelistedCrowdsale.sol";

contract WhitelistedPausableCrowdsale is WhitelistedCrowdsale, Pausable
{

    constructor() public
    {}

    function _preValidatePurchase(
        address _beneficiary,
        uint256 _weiAmount
    )
    internal
    whenNotPaused
    {
        super._preValidatePurchase(_beneficiary, _weiAmount);
    }

}