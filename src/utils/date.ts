export const formatDate = (timestamp?: number) => {
  if (!timestamp) return "No activity";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(new Date(timestamp));
};
