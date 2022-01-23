// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import "./TOK.sol";

contract ExpenseTracker is Ownable {
  using Counters for Counters.Counter;

  /**
   * Events
   */
  event CalculationFinished();
  event Transaction(address indexed from, address indexed to, uint256 amount);
  event ParticipantAdded(address indexed addr, string indexed name);
  event ExpenseAdded(
    address indexed debtor,
    address indexed payer,
    int256 amount
  );

  Counters.Counter public participantsCounter;

  TOK public token;

  struct Participant {
    address addr;
    string name;
  }

  struct Expense {
    address debtorAddr;
    address payerAddr;
    int256 amount;
  }

  struct Valid {
    uint256 id;
    bool valid;
  }

  mapping(address => Valid) public participants;
  mapping(uint256 => Participant) public iterativeParticipants;

  // Added expenses
  Expense[] public initialExpenses;

  // Final transactions calculated by the algorithm
  Expense[] public finalExpenses;

  constructor(address tokenAddress) {
    token = TOK(tokenAddress);
  }

  // Utilify function
  function min(int256 x, int256 y) internal pure returns (int256) {
    return x < y ? x : y;
  }

  // Utilify function
  function findIndexOfMax(int256[] memory array)
    internal
    pure
    returns (uint256)
  {
    uint256 indexOfMax = 0;
    for (uint256 i = 0; i < array.length; i++) {
      if (array[i] >= array[indexOfMax]) indexOfMax = i;
    }
    return indexOfMax;
  }

  // Utilify function
  function findIndexOfMin(int256[] memory array)
    internal
    pure
    returns (uint256)
  {
    uint256 indexOfMin = 0;
    for (uint256 i = 0; i < array.length; i++) {
      if (array[i] < array[indexOfMin]) indexOfMin = i;
    }
    return indexOfMin;
  }

  function addParticipant(address addr, string memory name) external onlyOwner {
    // Reverts if the participant is already added
    require(
      !participants[addr].valid,
      "ExpenseTracker: PARTICIPANT_ALREADY_ADDED"
    );

    // Saves informations
    participants[addr] = Valid(participantsCounter.current(), true);
    Participant memory participant = Participant(addr, name);
    iterativeParticipants[participantsCounter.current()] = participant;
    participantsCounter.increment();

    emit ParticipantAdded(addr, name);
  }

  function addExpense(
    address debtorAddr,
    address payerAddr,
    int256 amount
  ) external onlyOwner {
    // Reverts
    require(
      participants[debtorAddr].valid && participants[payerAddr].valid,
      "ExpenseTracker: PARTICIPANTS_NOT_ADDED"
    );
    require(
      amount <= int256(token.balanceOf(debtorAddr)),
      "ExpenseTracker: BALANCE_OF_DEBTOR_LESS_THAN_DEBIT"
    );
    Expense memory expense = Expense(debtorAddr, payerAddr, amount);
    initialExpenses.push(expense);

    emit ExpenseAdded(debtorAddr, payerAddr, amount);
  }

  function calculate() external onlyOwner {
    int256[] memory amountArray = new int256[](participantsCounter.current());
    for (uint256 i = 0; i < participantsCounter.current(); i++)
      amountArray[i] = 0;

    for (uint256 i = 0; i < initialExpenses.length; i++) {
      amountArray[
        participants[initialExpenses[i].debtorAddr].id
      ] -= initialExpenses[i].amount;
      amountArray[
        participants[initialExpenses[i].payerAddr].id
      ] += initialExpenses[i].amount;
    }

    uint256 maxCreditIndex;
    uint256 maxDebitIndex;

    do {
      maxCreditIndex = findIndexOfMax(amountArray);
      maxDebitIndex = findIndexOfMin(amountArray);

      int256 minAmount = min(
        amountArray[maxCreditIndex],
        -amountArray[maxDebitIndex]
      );

      amountArray[maxCreditIndex] -= minAmount;
      amountArray[maxDebitIndex] += minAmount;

      Expense memory expense = Expense(
        iterativeParticipants[maxDebitIndex].addr,
        iterativeParticipants[maxCreditIndex].addr,
        minAmount
      );

      finalExpenses.push(expense);
    } while (
      amountArray[maxCreditIndex] != 0 || amountArray[maxDebitIndex] != 0
    );

    require(paysExpenses(), "ExpenseTracker: TRANSFER_FAILED");

    emit CalculationFinished();
  }

  function paysExpenses() internal returns (bool) {
    for (uint256 i = 0; i < finalExpenses.length; i++) {
      token.transferFrom(
        finalExpenses[i].debtorAddr,
        finalExpenses[i].payerAddr,
        uint256(finalExpenses[i].amount)
      );
      emit Transaction(
        finalExpenses[i].debtorAddr,
        finalExpenses[i].payerAddr,
        uint256(finalExpenses[i].amount)
      );
    }

    return true;
  }

  function getInfo()
    external
    view
    returns (
      uint256,
      address,
      address[] memory,
      string[] memory,
      uint256[] memory,
      address[] memory,
      address[] memory,
      int256[] memory
    )
  {
    address[] memory participantsAddress = new address[](
      participantsCounter.current()
    );
    string[] memory participantsName = new string[](
      participantsCounter.current()
    );
    uint256[] memory participantsBalance = new uint256[](
      participantsCounter.current()
    );

    for (uint256 i = 0; i < participantsCounter.current(); i++) {
      participantsAddress[i] = iterativeParticipants[i].addr;
      participantsName[i] = iterativeParticipants[i].name;
      participantsBalance[i] = token.balanceOf(iterativeParticipants[i].addr);
    }

    address[] memory debtorsAddr = new address[](initialExpenses.length);
    address[] memory payersAddr = new address[](initialExpenses.length);
    int256[] memory amounts = new int256[](initialExpenses.length);

    for (uint256 i = 0; i < initialExpenses.length; i++) {
      debtorsAddr[i] = initialExpenses[i].debtorAddr;
      payersAddr[i] = initialExpenses[i].payerAddr;
      amounts[i] = initialExpenses[i].amount;
    }

    return (
      participantsCounter.current(),
      address(token),
      participantsAddress,
      participantsName,
      participantsBalance,
      debtorsAddr,
      payersAddr,
      amounts
    );
  }
}
