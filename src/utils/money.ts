export const formatINR = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Math.round(amount));

export const toRupees = (value: string) => Number(value.replace(/[^\d.]/g, "")) || 0;
