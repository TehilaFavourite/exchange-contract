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

        it("takes order actions and also cancel orders", async () => {
            // user1 deposits ether
            await exchange.depositEther({ from: user1, value: ether(1) })
            await exchange.makeOrder(tokenInstance.address, tokens(1), ETHER_ADDRESS, ether(1), { from: user1 })
            await exchange.cancelOrder('1', { from: user1 })
            // updates cancelled orders
            const orderCancelled = await exchange.orderCancelled(1)
            orderCancelled.should.equal(true)
            
            
        })

        
  });

  describe("order actions", async () => {
    it("takes order actions", async () => {
      // user1 deposits ether only
      await exchange.depositEther({ from: user1, value: ether(1) })
      // give tokens to user2
      await tokenInstance.transfer(user2, tokens(100), { from: owner })
      // user2 deposits tokens only
      await tokenInstance.approve(exchange.address, tokens(2), { from: user2 })
      await exchange.depositToken(tokenInstance.address, tokens(2), { from: user2 })
      // user1 makes an order to buy tokens with Ether
      await exchange.makeOrder(tokenInstance.address, tokens(1), ETHER_ADDRESS, ether(1), { from: user1 })
      // fill orders, executes the trade & charges fees
      await exchange.fillOrder('1', { from: user2 })
      let balance
          balance = await exchange.balanceOf(tokenInstance.address, user1)
          balance.toString().should.equal(tokens(1).toString(), 'user1 received tokens')
          balance = await exchange.balanceOf(ETHER_ADDRESS, user2)
          balance.toString().should.equal(ether(1).toString(), 'user2 received Ether')
          balance = await exchange.balanceOf(ETHER_ADDRESS, user1)
          balance.toString().should.equal('0', 'user1 Ether deducted')
          balance = await exchange.balanceOf(tokenInstance.address, user2)
          balance.toString().should.equal(tokens(0.9).toString(), 'user2 tokens deducted with fee applied')
          const feeAccount = await exchange.feeAccount()
          balance = await exchange.balanceOf(tokenInstance.address, feeAccount)
          balance.toString().should.equal(tokens(0.1).toString(), 'feeAccount received fee')
          // updates filled orders
          const orderFilled = await exchange.orderFilled(1)
          orderFilled.should.equal(true)
          // cancel orders and update canceled orders
          await exchange.cancelOrder('1', { from: user1 })
          const orderCancelled = await exchange.orderCancelled(1)
          orderCancelled.should.equal(true)
    })

    
    it('Check balances after filling user1 buy Tokens order', async () => {
      // user1 deposit 1 ETHER to the exchange
      await exchange.depositEther({from: user1, value: ether(1)})
      // user1 create order to buy 10 tokens for 1 ETHER
      await exchange.makeOrder(tokenInstance.address, tokens(10), ETHER_ADDRESS, ether(1), {from: user1})
      // user2 gets tokens
      await tokenInstance.transfer(user2, tokens(11), {from: owner})
      // user2 approve exchange to spend his tokens
      await tokenInstance.approve(exchange.address, tokens(11), {from: user2})
      // user2 deposit tokens + fee cost (1 token) to the exchange
      await exchange.depositToken(tokenInstance.address, tokens(11), {from: user2})
      // user2 fills the order
      await exchange.fillOrder('1', {from: user2})
      // user1 tokens balance on exchange should eq. 10
      await (await exchange.balanceOf(tokenInstance.address, user1)).toString().should.eq(tokens(10).toString())
      // user1 ether balance on exchange should eq. 0
      await (await exchange.balanceOf(ETHER_ADDRESS, user1)).toString().should.eq('0')
      // user2 tokens balance on exchange should eq. 0
      await (await exchange.balanceOf(tokenInstance.address, user2)).toString().should.eq('0')
      // user2 ether balance on exchange should eq. 1
      await (await exchange.balanceOf(ETHER_ADDRESS, user2)).toString().should.eq(ether(1).toString())
    })

    it("Check balances after filling user1 buy Ether order", async () => {
      // User1 Gets the 10 tokens
      await tokenInstance.transfer(user1, tokens(10), {from: owner})
      // user1 approve exchange to spend his tokens
      await tokenInstance.approve(exchange.address, tokens(10), {from: user1})
      // user1 approve send tokens to the exchange
      await exchange.depositToken(tokenInstance.address, tokens(10), {from: user1})
      // user1 create order to buy 1 Ether for 10 tokens
      await exchange.makeOrder(ETHER_ADDRESS, ether(1), tokenInstance.address, tokens(10), {from: user1})
      // user2 deposit 1 ETHER + fee cost (.1 ETH) to the exchange
      await exchange.depositEther({from: user2, value: ether(1.1)})
      // user2 fills the order
      await exchange.fillOrder('1', {from: user2})
      // user1 tokens balance on exchange should eq. 0
      await (await exchange.balanceOf(tokenInstance.address, user1)).toString().should.eq('0')
      // user1 Ether balance on exchange should eq. 1
      await (await exchange.balanceOf(ETHER_ADDRESS, user1)).toString().should.eq(ether(1).toString())
      // user2 tokens balance on exchange should eq. 10
      await (await exchange.balanceOf(tokenInstance.address, user2)).toString().should.eq(tokens(10).toString())
      // user2 ether balance on exchange should eq. 0
      await (await exchange.balanceOf(ETHER_ADDRESS, user2)).toString().should.eq('0')

    })
    
  })

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

      // it('rejects already-filled orders', async () => {
      //   // Fill the order
      //   await exchange.fillOrder('1', { from: user2 })
      //   // Try to fill it again
      //   await exchange.fillOrder('1', { from: user2 }).should.be.rejectedWith(EVM_REVERT)
      // })

      // it('rejects cancelled orders', async () => {
      //   // Cancel the order
      //   exchange.cancelOrder('1', { from: user1 }).should.be.fulfilled
      //   // Try to fill the order
      //   exchange.fillOrder('1', { from: user2 }).should.be.rejectedWith(EVM_REVERT)
      // })

      
  });

  
});
