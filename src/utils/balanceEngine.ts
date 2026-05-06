import { BalanceLine, BalanceResult, Expense, ExpenseSplit, Settlement } from "@/types";

const roundMoney = (value: number) => Math.round(value * 100) / 100;

export function splitExpense(expense: Pick<Expense, "amount" | "participantIds" | "splitType" | "splits">): ExpenseSplit[] {
  const participants = expense.participantIds;
  if (!participants.length) return [];

  if (expense.splitType === "equal") {
    const share = roundMoney(expense.amount / participants.length);
    const splits = participants.map((userId) => ({ userId, amount: share }));
    const drift = roundMoney(expense.amount - splits.reduce((sum, split) => sum + (split.amount ?? 0), 0));
    if (splits[0]) splits[0].amount = roundMoney((splits[0].amount ?? 0) + drift);
    return splits;
  }

  if (expense.splitType === "percentage") {
    return expense.splits.map((split) => ({
      userId: split.userId,
      percentage: split.percentage,
      amount: roundMoney((expense.amount * (split.percentage ?? 0)) / 100)
    }));
  }

  return expense.splits.map((split) => ({ userId: split.userId, amount: roundMoney(split.amount ?? 0) }));
}

export function computeBalances(expenses: Expense[], settlements: Settlement[] = []): BalanceResult {
  const netBalances: Record<string, number> = {};
  const memberBalances: Record<string, Record<string, number>> = {};

  expenses.forEach((expense) => {
    const splits = splitExpense(expense);
    netBalances[expense.payerId] = roundMoney((netBalances[expense.payerId] ?? 0) + expense.amount);

    splits.forEach((split) => {
      const amount = split.amount ?? 0;
      netBalances[split.userId] = roundMoney((netBalances[split.userId] ?? 0) - amount);
      if (split.userId === expense.payerId || amount <= 0) return;
      memberBalances[split.userId] = memberBalances[split.userId] ?? {};
      memberBalances[split.userId][expense.payerId] = roundMoney((memberBalances[split.userId][expense.payerId] ?? 0) + amount);
    });
  });

  settlements
    .filter((settlement) => settlement.status === "paid")
    .forEach((settlement) => {
      netBalances[settlement.payerId] = roundMoney((netBalances[settlement.payerId] ?? 0) + settlement.amount);
      netBalances[settlement.receiverId] = roundMoney((netBalances[settlement.receiverId] ?? 0) - settlement.amount);
    });

  return {
    memberBalances,
    netBalances,
    settlementSuggestions: simplifySettlements(netBalances)
  };
}

export function simplifySettlements(netBalances: Record<string, number>): BalanceLine[] {
  const debtors = Object.entries(netBalances)
    .filter(([, amount]) => amount < -0.5)
    .map(([userId, amount]) => ({ userId, amount: roundMoney(Math.abs(amount)) }));
  const creditors = Object.entries(netBalances)
    .filter(([, amount]) => amount > 0.5)
    .map(([userId, amount]) => ({ userId, amount: roundMoney(amount) }));
  const suggestions: BalanceLine[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amount = roundMoney(Math.min(debtor.amount, creditor.amount));
    suggestions.push({ from: debtor.userId, to: creditor.userId, amount });
    debtor.amount = roundMoney(debtor.amount - amount);
    creditor.amount = roundMoney(creditor.amount - amount);
    if (debtor.amount <= 0.5) debtorIndex += 1;
    if (creditor.amount <= 0.5) creditorIndex += 1;
  }

  return suggestions;
}
