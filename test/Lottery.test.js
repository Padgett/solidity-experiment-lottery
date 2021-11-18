const assert = require('assert');
const ganache = require('ganache-cli');
const Web3 = require('web3');
const web3 = new Web3(ganache.provider());
const { interface, bytecode } = require('../compile');

const entryAmount = web3.utils.toWei('0.011', 'ether');
let lottery;
let accounts;

beforeEach(async () => {
  accounts = await web3.eth.getAccounts();

  lottery = await new web3.eth.Contract(JSON.parse(interface))
    .deploy({data: bytecode})
    .send({from: accounts[0], gas: '1000000'});
});

describe('Lottery', () => {
  it('deploys', () => {
    assert.ok(lottery.options.address);
  });

  it('allows a player entry', async () => {
    await lottery.methods.enter().send({
      from: accounts[1],
      value: entryAmount
    });

    const players = await lottery.methods.getPlayers().call({from: accounts[1]});

    assert.equal(accounts[1], players[0]);
    assert.equal(1, players.length);
  });

  it('allows multiple player entries', async () => {
    await lottery.methods.enter().send({
      from: accounts[1],
      value: entryAmount
    });
    await lottery.methods.enter().send({
      from: accounts[2],
      value: entryAmount
    });
    await lottery.methods.enter().send({
      from: accounts[3],
      value: entryAmount
    });

    const players = await lottery.methods.getPlayers().call({from: accounts[0]});

    assert.equal(accounts[1], players[0]);
    assert.equal(accounts[2], players[1]);
    assert.equal(accounts[3], players[2]);
    assert.equal(3, players.length);
  });

  it('requires a minimum amount of ether to enter', async () => {
    try {
      await lottery.methods.enter().send({
        from: accounts[1],
        value: web3.utils.toWei('0.001', 'ether')
      });
    } catch (err) {
      assert(err);
      return;
    }
    assert(false);
  });

  it('restricts pickWinner to manager', async () => {
    try {
      await lottery.methods.pickWinner().send({
        from: accounts[1]
      });
    } catch (err) {
      assert(err);
      return;
    }
    assert(false);
  });

  it('sends money to the winner and resets', async () => {
    await lottery.methods.enter().send({
      from: accounts[1],
      value: entryAmount
    });

    const initialBalance = await web3.eth.getBalance(accounts[1]);

    await lottery.methods.pickWinner().send({from: accounts[0]});

    const finalBalance = await web3.eth.getBalance(accounts[1]);

    const difference = (finalBalance - initialBalance);
    const players = await lottery.methods.getPlayers().call({from: accounts[0]});
    assert.equal(difference, entryAmount);
    assert.equal(0, players.length);

    const lotteryBalance = await web3.eth.getBalance(lottery.options.address);
    assert.equal(0, lotteryBalance);
  })
});
