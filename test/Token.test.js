const EVM_REVERT = "VM Exception while processing transaction: revert";

const Token = artifacts.require("Token");
const Web3 = require("web3");

const tokens = (n) => {
  return new Web3.utils.BN(Web3.utils.toWei(n.toString(), "ether"));
};
require("chai").use(require("chai-as-promised")).should();

contract("Deploying", function (accounts) {
  [owner, receiver1, receiver2] = accounts;
  let tokenInstance;
  let result;
  let amount;

  beforeEach(async () => {
    tokenInstance = await Token.new();
  });

  describe("Deploying", async () => {
    it("gets correct name, symbol, total supply and decimal", async () => {
      const _name = await tokenInstance.name();
      const _symbol = await tokenInstance.symbol();
      const _totSupply = await tokenInstance.totalSupply();
      const _decimal = await tokenInstance.decimal();
      const _balanceOf = await tokenInstance.balanceOf(owner);
      console.log("the token contract name is: ", _name);
      console.log("the token contract symbol is: ", _symbol);
      console.log(
        "the token contract total supply is: ",
        _totSupply.toString()
      );
      console.log("the token contract decimal is: ", _decimal.toString());
      console.log("the balance of the owner is: ", _balanceOf.toString());
    });
  });

  describe("success", async () => {
    // describe("deploying", async () => {
    it("transfers token to the receiver", async () => {
      const _transferAmount = tokens(10000000);
      await tokenInstance.transfer(receiver1, _transferAmount, {
        from: owner,
      });
      const ownerBal = await tokenInstance.balanceOf(owner);
      const rcv1Bal = await tokenInstance.balanceOf(receiver1);
      console.log("the balance of the owner is: ", ownerBal.toString());
      console.log("the balance of the receiver1 is: ", rcv1Bal.toString());
    });
    // });
  });

  describe("failure", async () => {
    it("rejects insufficient balances", async () => {
      let invalidAmount;
      invalidAmount = tokens(20000001); // 100 million - greater than total supply
      await tokenInstance
        .transfer(receiver1, invalidAmount, { from: owner })
        .should.be.rejectedWith(EVM_REVERT);

      // Attempt transfer tokens, when you have none
      invalidAmount = tokens(1); // recipient has no tokens
      await tokenInstance
        .transfer(owner, invalidAmount, { from: receiver1 })
        .should.be.rejectedWith(EVM_REVERT);
    });

    it("rejects invalid recipients", async () => {
      await tokenInstance.transfer(0x0, amount, { from: owner }).should.be
        .rejected;
    });
  });

  describe("approving tokens", () => {
    const approvedAmt = tokens(5000000);
    const _allow = tokens(5000000);
    it("approve for delegated token spending on exchange", async () => {
      await tokenInstance.approve(receiver2, approvedAmt, {
        from: owner,
      });
      console.log("the approved amount is: ", approvedAmt.toString());
    });

    it("allocates an allowance for delegated token spending on exchange", async () => {
      await tokenInstance.allowance(owner, receiver2);
      console.log("the approved allowance is: ", _allow.toString());
    });

    it("rejects invalid spenders", () => {
      tokenInstance.approve(0x0, amount, { from: owner }).should.be.rejected;
    });

    const Amt = tokens(3000000);
    it("approves tokens for delegated transfer", async () => {
      await tokenInstance.approve(receiver2, approvedAmt, { from: owner });
      const _allowance = await tokenInstance.allowance(owner, receiver2);
      const _balanceOfOwner = await tokenInstance.balanceOf(owner);
      const rcv1balance = await tokenInstance.balanceOf(receiver1);

      console.log("the allowance amount is:", _allowance.toString());
      console.log(
        "the owner balance before transfer from is: ",
        _balanceOfOwner.toString()
      );
      console.log(
        "the initial balance of receiver1 is :",
        rcv1balance.toString()
      );

      await tokenInstance.transferFrom(owner, receiver1, Amt, {
        from: receiver2,
      });

      const _balOfOwner = await tokenInstance.balanceOf(owner);
      const rcv1balances = await tokenInstance.balanceOf(receiver1);
      console.log(
        "the new owner balance after transfer from is: ",
        _balOfOwner.toString()
      );
      console.log("the new balance of receiver1 is :", rcv1balances.toString());
    });

    describe("failure", async () => {
      it("rejects insufficient amounts", () => {
        // Attempt transfer too many tokens
        const invalidAmt = tokens(5000001);
        tokenInstance
          .transferFrom(owner, receiver1, invalidAmt, { from: receiver2 })
          .should.be.rejectedWith(EVM_REVERT);
      });

      it("rejects invalid recipients", () => {
        tokenInstance.transferFrom(owner, 0x0, amount, { from: receiver2 })
          .should.be.rejected;
      });
    });
  });
});
