const EVM_REVERT = "VM Exception while processing transaction: revert";
const ETHER_ADDRESS = "0x0000000000000000000000000000000000000000";


const Token = artifacts.require("Token");
const Exchange = artifacts.require("Exchange");
const Web3 = require("web3");

const ether = (n) => {
  return new Web3.utils.BN(Web3.utils.toWei(n.toString(), "ether"));
};
const tokens = (n) => ether(n)

require("chai").use(require("chai-as-promised")).should();

contract("Exchange", function (accounts) {
  [owner, feeAcct, user1, user2] = accounts;

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
            
        it('withdraws token funds', async () => {
            const tokenbalance = await exchange.trackDeposit(tokenInstance.address, user1)
            tokenbalance.toString().should.equal('0')
            })  

        it('withdraws Ether funds', async () => {
            const etherbalance = await exchange.trackDeposit(ETHER_ADDRESS, user1)
            etherbalance.toString().should.equal('0')
            })

        it('returns user balance', async () => {
            exchange.depositEther({ from: user1, value: amount })
            const result = await exchange.balanceOf(ETHER_ADDRESS, user1)
            console.log("the user balance is after withdrawal: ", result.toString());;
            })
        
        it("tracks the newly created order", async () => {
            await exchange.makeOrder(tokenInstance.address, tokens(1), ETHER_ADDRESS, ether(1), { from: user1 })
            await exchange.orderCount();
            console.log("the new order created is: ", 1);
            const order = await exchange.orders('1')
            order.id.toString().should.equal('1', 'id is correct')
            order.user.should.equal(user1, 'user is correct')
            order.tokenGet.should.equal(tokenInstance.address, 'tokenGet is correct')
            order.amountGet.toString().should.equal(tokens(1).toString(), 'amountGet is correct')
            order.tokenGive.should.equal(ETHER_ADDRESS, 'tokenGive is correct')
            order.amountGive.toString().should.equal(ether(1).toString(), 'amountGive is correct')
            order.timestamp.toString().length.should.be.at.least(1, 'timestamp is present')
        })

        it("takes order actions", async () => {
            // user1 deposits ether
            await exchange.depositEther({ from: user1, value: ether(1) })
            await exchange.makeOrder(tokenInstance.address, tokens(1), ETHER_ADDRESS, ether(1), { from: user1 })
            
        })

        it("cancel orders", async () => {
            await exchange.cancelOrder('1', { from: user1 })
            const orderCancelled = await exchange.orderCancelled(1)
            orderCancelled.should.equal(true)
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

    it('rejects invalid order ids', async () => {
        const invalidOrderId = 99999
        await exchange.cancelOrder(invalidOrderId, { from: user1 }).should.be.rejectedWith(EVM_REVERT)
      })

      it('rejects unauthorized cancelations', async () => {
        // Try to cancel the order from another user
        await exchange.cancelOrder('1', { from: user2 }).should.be.rejectedWith(EVM_REVERT)
      })
  });
});
