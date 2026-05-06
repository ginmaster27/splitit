import { createGroup, addExpense, upsertUser } from "@/services/firebase/firestore";
import { computeBalances, splitExpense } from "@/utils/balanceEngine";
import { Expense, Group, UserProfile } from "@/types";

const updatedAt = Date.now();

export const mockUsers: UserProfile[] = [
  { id: "mock-rahul", name: "Rahul", email: "rahul@gmail.com", upiId: "rahul@upi", totalOwed: 0, totalReceivable: 0, netBalance: 0, updatedAt },
  { id: "mock-shreya", name: "Shreya", email: "shreya@gmail.com", upiId: "shreya@upi", totalOwed: 0, totalReceivable: 0, netBalance: 0, updatedAt },
  { id: "mock-pramit", name: "Pramit", email: "pramit@gmail.com", upiId: "pramit@upi", totalOwed: 0, totalReceivable: 0, netBalance: 0, updatedAt },
  { id: "mock-pallavi", name: "Pallavi", email: "pallavi@gmail.com", upiId: "pallavi@upi", totalOwed: 0, totalReceivable: 0, netBalance: 0, updatedAt }
];

export async function seedMockDataForUser(currentUser: UserProfile) {
  const members = [currentUser, ...mockUsers.filter((user) => user.email !== currentUser.email)];
  await Promise.all(members.map(upsertUser));

  const base = {
    memberIds: members.map((member) => member.id),
    memberProfiles: members.map(({ id, name, email, avatar, upiId }) => ({ id, name, email, avatar, upiId })),
    totalSpend: 0,
    balanceSummary: {},
    updatedAt,
    createdBy: currentUser.id
  };

  const turya = await createGroup({ ...base, name: "Turya Expense", type: "Trip" });
  const phf = await createGroup({ ...base, name: "PHF Meet Up", type: "Friends" });

  await seedExpense(turya, {
    groupId: turya.id,
    title: "Dinner",
    amount: 2400,
    payerId: members[0].id,
    payerName: members[0].name,
    participantIds: members.map((member) => member.id),
    splitType: "equal",
    splits: [],
    category: "Food",
    notes: "Team dinner",
    createdAt: Date.now()
  });

  await seedExpense(phf, {
    groupId: phf.id,
    title: "Swiggy order",
    amount: 1200,
    payerId: members[1].id,
    payerName: members[1].name,
    participantIds: members.slice(0, 3).map((member) => member.id),
    splitType: "equal",
    splits: [],
    category: "Food",
    notes: "Snacks and dinner",
    createdAt: Date.now() - 3600 * 1000
  });
}

async function seedExpense(group: Group, expense: Omit<Expense, "id">) {
  const completedExpense = { ...expense, splits: splitExpense(expense) };
  const balances = computeBalances([{ id: `seed-${expense.title}`, ...completedExpense }]).netBalances;
  await addExpense(completedExpense, group, balances);
}
