const EVM_REVERT = "VM Exception while processing transaction: revert";
const ETHER_ADDRESS = "0x0000000000000000000000000000000000000000";

const Token = artifacts.require("Token");
const Exchange = artifacts.require("Exchange");
const Web3 = require("web3");

const tokens = (n) => {
  return new Web3.utils.BN(Web3.utils.toWei(n.toString(), "ether"));
};
require("chai").use(require("chai-as-promised")).should();

contract("Exchange", function (accounts) {
  [owner, feeAcct, user1] = accounts;

  let exchange;
  let tokenInstance;
  let amount = tokens(10);
  const _feePercent = 10;
  
  

  beforeEach(async () => {
    tokenInstance = await Token.new();
    exchange = await Exchange.new(feeAcct, _feePercent);
    const _transferAmount = tokens(10000000);
    await tokenInstance.transfer(user1, _transferAmount, {
      from: owner,
    });
  });

  describe("Deploying", async () => {
    it("tracks the fee account", async () => {
      const feeAcc = await exchange.feeAccount();
      const _feePercent = await exchange.feePercent();
      console.log("the fee account is:", feeAcc);
      console.log("the fee percent is:", _feePercent.toString());
    });
  });

  describe("deposit and withdraw success", async () => {
    it("tracks the amount", async () => {
      await tokenInstance.approve(exchange.address, amount, { from: user1 });
      deposit = await exchange.depositToken(
        tokenInstance.address,
        amount,
        { from: user1 }
      );
      await tokenInstance.balanceOf(exchange.address);
      console.log("the exchange balance is:", amount.toString());
      const depBal = await exchange.trackDeposit(tokenInstance.address, user1);
      console.log("the new deposit balance is: ", depBal.toString());
    });

    it("tracks depositing ether", async () => {
        await exchange.depositEther({ from: user1, value: amount});
        const ethBal = await exchange.trackDeposit(ETHER_ADDRESS, user1);
        console.log("the ether balance is: ", ethBal.toString()) 
    })

    it('reverts when Ether is sent', async () => {
        await exchange.sendTransaction({ value: 1, from: user1 }).should.be.rejectedWith(EVM_REVERT)
      }) 
    
    it('withdraws Ether funds', async () => {
        const balance = await exchange.trackDeposit(ETHER_ADDRESS, user1)
        balance.toString().should.equal('0')
      })
      
  });
  


  describe("failure", () => {
    it("rejects Ether deposits", async () => {
      await exchange
        .depositToken(ETHER_ADDRESS, amount, { from: user1 })
        .should.be.rejectedWith(EVM_REVERT);
    });

    it("fails when no tokens are approved", async () => {
      // Don't approve any tokens before depositing
      await exchange
        .depositToken(tokenInstance.address, amount, { from: user1 })
        .should.be.rejectedWith(EVM_REVERT);
    });
  });
});
