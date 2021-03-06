var EctoToken = artifacts.require("./EctoToken.sol");
var EctoCrowdsale = artifacts.require("./EctoCrowdsale.sol");
var Promise = require('bluebird');
var sleep = require('sleep');

const ONE_WEEK = 7 * 24 * 60 * 60;
const BigNumber = web3.BigNumber;

web3.eth.getBalance = Promise.promisify(web3.eth.getBalance);
web3.eth.getAccounts = Promise.promisify(web3.eth.getAccounts);
web3.eth.getTransactionCount = Promise.promisify(web3.eth.getTransactionCount);
web3.eth.getBlock = Promise.promisify(web3.eth.getBlock);
web3.eth.getTransactionReceipt = Promise.promisify(web3.eth.getTransactionReceipt);

module.exports = function(deployer, network, accounts)
{
    deployer.then(async () =>
    {
        console.log("Using web3 version", web3.version.api);
        console.log("");

        // sale params
        global.BASE_RATE = new BigNumber(6000);
        global.CAP = web3.toWei(15000, 'ether');
        global.WALLET = accounts[1];
        global.extraTokensPercentage = 35; // founders, company, advisers etc tokens percentage of total supply
        global.bonuses = // [min contribution in ETH, bonus percentage] and must be in decending order !
            [
            {
                threshold: web3.toWei(3),
                bonus: 30
            },
            {
                threshold: web3.toWei(2),
                bonus: 20
            },
            {
                threshold: web3.toWei(1),
                bonus: 10
            }, ];

        // deployment params
        this.gasToUseForContracts = 4700000;
        this.ownerAddress = accounts[0];

        console.group(" ---------------------- Migration parameters ----------------------");
        console.log("Migrating  to network " + network);
        console.log("Addresses (accounts) used")
        console.log("   Owner", ownerAddress);
        console.log("   Wallet", global.WALLET);
        console.log("Sale metrics");
        console.log("   Hard cap", web3.fromWei(global.CAP));
        console.log("   Base rate", global.BASE_RATE.toNumber().toLocaleString());
        for (var i = 0; i < global.bonuses.length; i++)
        {
            console.log("   Bonus " + i + ": [" + web3.fromWei(global.bonuses[i].threshold) + " ether, " + global.bonuses[i].bonus + " %]");
        }
        console.groupEnd();
        console.log(" ---------------------------------------------------------------- \r\n");

        // helper function to calc bonus rates in javascript
        global.getRate = function(weiAmount)
        {
            for (var i = 0; i < global.bonuses.length; i++)
            {
                if (new BigNumber(weiAmount).toNumber() >= new BigNumber(global.bonuses[i].threshold).toNumber())
                {
                    return global.BASE_RATE.mul(100 + global.bonuses[i].bonus).div(100);
                }
            }

            return global.BASE_RATE;
        };

        console.group(" ---------------------- Migration results ----------------------");

        // add all gas costs here
        var totalGasUsed = 0;

        // aim token deployment
        mainnetSleep(network);
        this.token = await deployer.deploy(EctoToken,
        {
            from: ownerAddress,
            gas: gasToUseForContracts
        });
        var txReceipt = await web3.eth.getTransactionReceipt(this.token.transactionHash);
        console.log("Token deployed... with gas used", txReceipt.gasUsed);
        totalGasUsed += txReceipt.gasUsed;


        // aim token sale
        mainnetSleep(network);
        this.crowdsale = await deployer.deploy(
            EctoCrowdsale,
            global.CAP,
            global.BASE_RATE,
            global.WALLET,
            token.address,
            global.bonuses.map(function(val)
            {
                return val.threshold;
            }),
            global.bonuses.map(function(val)
            {
                return val.bonus;
            }),
            {
                from: ownerAddress,
                gas: gasToUseForContracts
            })


        mainnetSleep(network);
        txReceipt = await web3.eth.getTransactionReceipt(this.crowdsale.transactionHash);
        console.log("Sale deployed... with gas used", txReceipt.gasUsed);
        totalGasUsed += txReceipt.gasUsed;

        // pause token for everyone except owner and sale
        mainnetSleep(network);
        var tx = await this.token.pause(
        {
            from: ownerAddress,
            gas: gasToUseForContracts
        });
        totalGasUsed += tx.receipt.gasUsed;

        mainnetSleep(network);
        tx = await this.token.addExceptions([ownerAddress, this.crowdsale.address],
        {
            from: ownerAddress,
            gas: gasToUseForContracts
        });
        totalGasUsed += tx.receipt.gasUsed;
        console.log("Token paused for transfers, except for owner & sale accounts...");

        mainnetSleep(network);
        // pause sale
        tx = await this.crowdsale.pause(
        {
            from: ownerAddress,
            gas: gasToUseForContracts
        });
        totalGasUsed += tx.receipt.gasUsed;
        console.log("Token sale paused...");

        mainnetSleep(network);
        // transfer all non-extra tokens to crowdsale address
        tx = await this.token.transfer(this.crowdsale.address, (100 - global.extraTokensPercentage) / 100 * (await this.token.totalSupply()),
        {
            from: ownerAddress,
            gas: gasToUseForContracts
        });
        totalGasUsed += tx.receipt.gasUsed;
        console.log("Reserved tokens transferred...");

        // print information for saving purposes
        var tokenOwner = await token.owner.call();
        console.log("Token address", this.token.address);
        console.log("Token owner", tokenOwner);
        console.log("Sale address", this.crowdsale.address);
        console.log("Token total supply", web3.fromWei((await this.token.totalSupply())).toNumber().toLocaleString());
        console.log("Sale balance", web3.fromWei((await this.token.balanceOf(this.crowdsale.address))).toNumber().toLocaleString());
        console.log("Reserved balance", web3.fromWei((await this.token.balanceOf(ownerAddress))).toNumber().toLocaleString());
        console.log("");
        console.log("Total gas used", totalGasUsed.toLocaleString());
        console.groupEnd();
        console.log(" ---------------------------------------------------------------- \r\n");
    })

    function timeConverter(UNIX_timestamp)
    {
        var a = new Date(UNIX_timestamp * 1000);
        var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        var year = a.getFullYear();
        var month = months[a.getMonth()];
        var date = a.getDate();
        var hour = a.getHours();
        var min = a.getMinutes();
        var sec = a.getSeconds();
        var time = date + ' ' + month + ' ' + year + ' ' + hour + ':' + min + ':' + sec;
        return time;
    }

    function mainnetSleep(network)
    {
        if (network == "mainnet")
        {
            console.log("Sleeping ...");
            sleep.sleep(120);
        }
    }
}