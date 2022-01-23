const { assert } = require("chai");
const { expectRevert, expectEvent } = require("@openzeppelin/test-helpers");

const TOK = artifacts.require("TOK");
const ExpenseTracker = artifacts.require("ExpenseTracker");

contract("Expense Tracker", (accounts) => {
  const owner = accounts[0];

  describe("#addParticipant", () => {
    let tracker;
    let token;
    let participant1 = accounts[1];

    beforeEach(async () => {
      token = await TOK.new({ from: owner });
      tracker = await ExpenseTracker.new(token.address, { from: owner });
    });

    it("Saves the participant's informations", async () => {
      await token.mint(participant1, web3.utils.toWei("1"), { from: owner });
      await tracker.addParticipant(participant1, "Niccolò", {
        from: owner,
      });

      let infos = await tracker.getInfo();
      let participantAddress = infos[2][0];
      let participantName = infos[3][0];
      let participantBalance = infos[4][0];
      let index = infos[0];

      assert.strictEqual(participant1, participantAddress);
      assert.strictEqual("Niccolò", participantName);
      assert.strictEqual(web3.utils.toWei("1"), participantBalance.toString());
      // increments participants counter
      assert.strictEqual("1", index.toString());
    });

    it("Reverts if the participant is already added", async () => {
      await tracker.addParticipant(participant1, "Niccolò", {
        from: owner,
      });
      await expectRevert.unspecified(
        tracker.addParticipant(participant1, "Niccolò", {
          from: owner,
        })
      );
    });
  });

  describe("#addExpense", () => {
    let tracker;
    let token;
    let participant1 = accounts[1];
    let participant2 = accounts[2];

    beforeEach(async () => {
      token = await TOK.new({ from: owner });
      tracker = await ExpenseTracker.new(token.address, { from: owner });
    });

    it("Reverts if one of the two participants or both aren't added", async () => {
      await expectRevert(
        tracker.addExpense(participant1, participant2, web3.utils.toWei("1"), {
          from: owner,
        }),
        "ExpenseTracker: PARTICIPANTS_NOT_ADDED"
      );
    });

    it("Reverts if the debtor's doesn't have enough TOK to pay the debt", async () => {
      await tracker.addParticipant(participant1, "Niccolò", {
        from: owner,
      });
      await tracker.addParticipant(participant2, "Marco", {
        from: owner,
      });
      let debtorBalance = await token.balanceOf(participant1);
      assert.strictEqual("0", web3.utils.fromWei(debtorBalance));
      await expectRevert(
        tracker.addExpense(participant1, participant2, web3.utils.toWei("1"), {
          from: owner,
        }),
        "ExpenseTracker: BALANCE_OF_DEBTOR_LESS_THAN_DEBIT"
      );
    });

    it("Saves the expense", async () => {
      await tracker.addParticipant(participant1, "Niccolò", {
        from: owner,
      });
      await tracker.addParticipant(participant2, "Marco", {
        from: owner,
      });
      await token.mint(participant1, web3.utils.toWei("100"), { from: owner });
      await tracker.addExpense(
        participant1,
        participant2,
        web3.utils.toWei("50"),
        {
          from: owner,
        }
      );

      let infos = await tracker.getInfo();
      let debtorAddress = infos[5][0];
      let payerAddress = infos[6][0];
      let debt = infos[7][0];

      assert.strictEqual(participant1, debtorAddress);
      assert.strictEqual(participant2, payerAddress);
      assert.strictEqual(debt.toString(), web3.utils.toWei("50"));
    });
  });

  describe("#calculate", () => {
    let tracker;
    let token;
    let participant1 = accounts[1];
    let participant2 = accounts[2];
    let participant3 = accounts[3];

    beforeEach(async () => {
      token = await TOK.new({ from: owner });
      tracker = await ExpenseTracker.new(token.address, { from: owner });

      await token.mint(participant1, web3.utils.toWei("1000"), { from: owner });
      await token.mint(participant2, web3.utils.toWei("1000"), { from: owner });

      await token.approve(tracker.address, web3.utils.toWei("1000"), {
        from: participant1,
      });
      await token.approve(tracker.address, web3.utils.toWei("1000"), {
        from: participant2,
      });

      await tracker.addParticipant(participant1, "Niccolò", {
        from: owner,
      });
      await tracker.addParticipant(participant2, "Marco", {
        from: owner,
      });
      await tracker.addParticipant(participant3, "Luca", {
        from: owner,
      });
      await tracker.addExpense(
        participant1,
        participant2,
        web3.utils.toWei("1000"),
        {
          from: owner,
        }
      );
      await tracker.addExpense(
        participant2,
        participant3,
        web3.utils.toWei("1000"),
        {
          from: owner,
        }
      );
    });

    it("emits an event", async () => {
      let receipt = await tracker.calculate({ from: owner });
      expectEvent(receipt, "CalculationFinished");
      expectEvent(receipt, "Transaction", {
        from: participant1,
        to: participant3,
        amount: web3.utils.toWei("1000"),
      });
    });
  });

  describe("#example", () => {
    let tracker;
    let token;
    let participant1 = accounts[1];
    let participant2 = accounts[2];
    let participant3 = accounts[3];
    let participant4 = accounts[4];

    beforeEach(async () => {
      token = await TOK.new({ from: owner });
      tracker = await ExpenseTracker.new(token.address, { from: owner });

      await token.mint(participant1, web3.utils.toWei("1000"), {
        from: owner,
      });
      await token.mint(participant2, web3.utils.toWei("1000"), {
        from: owner,
      });
      await token.mint(participant3, web3.utils.toWei("1000"), {
        from: owner,
      });
      await token.mint(participant4, web3.utils.toWei("1000"), {
        from: owner,
      });

      await token.approve(tracker.address, web3.utils.toWei("1000"), {
        from: participant1,
      });
      await token.approve(tracker.address, web3.utils.toWei("1000"), {
        from: participant2,
      });
      await token.approve(tracker.address, web3.utils.toWei("1000"), {
        from: participant3,
      });
      await token.approve(tracker.address, web3.utils.toWei("1000"), {
        from: participant4,
      });

      await tracker.addParticipant(participant1, "Marco", {
        from: owner,
      });
      await tracker.addParticipant(participant2, "Daniel", {
        from: owner,
      });
      await tracker.addParticipant(participant3, "Lorenzo", {
        from: owner,
      });
      await tracker.addParticipant(participant4, "Giorgio", {
        from: owner,
      });
    });

    it("Example2", async () => {
      await tracker.addExpense(
        participant4, // Giorgio
        participant2, // Daniel
        web3.utils.toWei("33"),
        {
          from: owner,
        }
      );
      await tracker.addExpense(
        participant2, // Daniel
        participant2, // Daniel
        web3.utils.toWei("33"),
        {
          from: owner,
        }
      );
      await tracker.addExpense(
        participant1, // Marco
        participant2, // Daniel
        web3.utils.toWei("33"),
        {
          from: owner,
        }
      );
      await tracker.addExpense(
        participant4, // Giorgio
        participant1, // Marco
        web3.utils.toWei("19"),
        {
          from: owner,
        }
      );
      await tracker.addExpense(
        participant3, // Lorenzo
        participant1, // Marco
        web3.utils.toWei("19"),
        {
          from: owner,
        }
      );

      let receipt = await tracker.calculate();

      expectEvent(receipt, "CalculationFinished");

      // Should calculate 3 transactions
      expectEvent(receipt, "Transaction", {
        from: participant4,
        to: participant2,
        amount: web3.utils.toWei("52"),
      });
      expectEvent(receipt, "Transaction", {
        from: participant3,
        to: participant2,
        amount: web3.utils.toWei("14"),
      });
      expectEvent(receipt, "Transaction", {
        from: participant3,
        to: participant1,
        amount: web3.utils.toWei("5"),
      });
    });
  });
});
