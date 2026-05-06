import { Expense, UserProfile } from "@/types";

type ImportedMember = Pick<UserProfile, "id" | "name" | "email" | "avatar" | "upiId">;

export interface SplitwiseImportResult {
  members: ImportedMember[];
  expenses: Omit<Expense, "id" | "groupId">[];
  skippedRows: number;
}

type CsvRow = Record<string, string>;

const REQUIRED_COLUMNS = ["Date", "Description", "Category", "Cost", "Currency"];

export function parseSplitwiseCsv(csvText: string, currentUser: UserProfile): SplitwiseImportResult {
  const rows = parseCsv(csvText.trim());
  if (rows.length < 2) throw new Error("The CSV does not contain any expense rows.");

  const [headers, ...records] = rows;
  const missing = REQUIRED_COLUMNS.filter((column) => !headers.includes(column));
  if (missing.length) throw new Error(`Missing Splitwise columns: ${missing.join(", ")}`);

  const memberNames = headers.slice(headers.indexOf("Currency") + 1).map((name) => name.trim()).filter(Boolean);
  if (!memberNames.length) throw new Error("No Splitwise member columns were found.");

  const currentUserMemberName = findCurrentUserSplitwiseName(memberNames, currentUser);
  const members = memberNames.map((name) => toImportedMember(name, currentUser, name === currentUserMemberName));
  if (!currentUserMemberName) {
    members.unshift({
      id: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
      avatar: currentUser.avatar,
      upiId: currentUser.upiId
    });
  }

  const memberByName = new Map(members.map((member) => [member.name, member]));
  const csvRows = records.map((row) => toRow(headers, row));
  const expenses: Omit<Expense, "id" | "groupId">[] = [];
  let skippedRows = 0;

  csvRows.forEach((row) => {
    if (isTotalRow(row)) {
      skippedRows += 1;
      return;
    }

    const imported = buildExpensesForRow(row, memberNames, memberByName);
    if (!imported.length) {
      skippedRows += 1;
      return;
    }
    expenses.push(...imported);
  });

  if (!expenses.length) throw new Error("No importable Splitwise expenses were found.");
  return { members, expenses, skippedRows };
}

function parseCsv(csvText: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const next = csvText[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(value.trim());
      value = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(value.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }

  row.push(value.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function toRow(headers: string[], values: string[]): CsvRow {
  return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
}

function toImportedMember(name: string, currentUser: UserProfile, isCurrentUser: boolean): ImportedMember {
  if (isCurrentUser) {
    return {
      id: currentUser.id,
      name: currentUser.name || name,
      email: currentUser.email,
      avatar: currentUser.avatar,
      upiId: currentUser.upiId
    };
  }

  return {
    id: `splitwise-${hashName(name)}`,
    name,
    email: "",
    upiId: ""
  };
}

function findCurrentUserSplitwiseName(memberNames: string[], currentUser: UserProfile) {
  const candidates = new Set(
    [currentUser.name, currentUser.name.split(" ")[0], currentUser.email.split("@")[0]]
      .map(normalizeName)
      .filter(Boolean)
  );
  return memberNames.find((name) => candidates.has(normalizeName(name)));
}

function buildExpensesForRow(row: CsvRow, memberNames: string[], memberByName: Map<string, ImportedMember>): Omit<Expense, "id" | "groupId">[] {
  const amount = parseMoney(row.Cost);
  const createdAt = parseDate(row.Date);
  const description = row.Description?.trim();
  if (!amount || !createdAt || !description) return [];

  const balances = memberNames
    .map((name) => ({
      member: memberByName.get(name),
      value: parseMoney(row[name])
    }))
    .filter((item): item is { member: ImportedMember; value: number } => Boolean(item.member) && Math.abs(item.value) > 0.005);

  const creditors = balances.filter((item) => item.value > 0);
  const debtors = balances.filter((item) => item.value < 0);
  if (!creditors.length || !debtors.length) return [];

  if (creditors.length === 1) {
    const payer = creditors[0];
    const splits = balances.map(({ member, value }) => ({
      userId: member.id,
      amount: value < 0 ? Math.abs(value) : Math.max(0, amount - value)
    }));
    return [
      {
        title: description,
        category: row.Category?.trim() || "Other",
        payerId: payer.member.id,
        payerName: payer.member.name,
        participantIds: balances.map(({ member }) => member.id),
        amount,
        splitType: "exact",
        splits,
        notes: row.Currency ? `Imported from Splitwise CSV (${row.Currency})` : "Imported from Splitwise CSV",
        createdAt
      }
    ];
  }

  const totalCredit = creditors.reduce((sum, item) => sum + item.value, 0);
  return creditors.map(({ member: payer, value }) => {
    const ratio = value / totalCredit;
    const splits = debtors.map(({ member, value: debtorValue }) => ({
      userId: member.id,
      amount: roundMoney(Math.abs(debtorValue) * ratio)
    }));
    const importedAmount = roundMoney(splits.reduce((sum, split) => sum + split.amount, 0));
    return {
      title: `${description} (${payer.name})`,
      category: row.Category?.trim() || "Other",
      payerId: payer.id,
      payerName: payer.name,
      participantIds: [payer.id, ...debtors.map(({ member }) => member.id)],
      amount: importedAmount,
      splitType: "exact",
      splits,
      notes: `Imported from Splitwise CSV. Original cost: ${row.Cost} ${row.Currency}`.trim(),
      createdAt
    };
  });
}

function isTotalRow(row: CsvRow) {
  const description = `${row.Date} ${row.Description}`.toLowerCase();
  return description.includes("total balance") || description === "total" || description.includes("total balances");
}

function parseMoney(value: string | undefined) {
  if (!value) return 0;
  const cleaned = value.replace(/[^\d.-]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? roundMoney(parsed) : 0;
}

function parseDate(value: string | undefined) {
  if (!value) return 0;
  const parsed = Date.parse(value);
  if (Number.isFinite(parsed)) return parsed;

  const parts = value.split(/[/-]/).map(Number);
  if (parts.length === 3 && parts.every(Number.isFinite)) {
    const [first, second, third] = parts;
    const year = third < 100 ? 2000 + third : third;
    return new Date(year, second - 1, first).getTime();
  }
  return 0;
}

function hashName(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return `${normalizeName(value)}-${Math.abs(hash)}`;
}

function normalizeName(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}
