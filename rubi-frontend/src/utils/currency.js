export function parseCurrency(str) {
  if (!str) return 0;
  return parseFloat(
    str.replace("R$ ", "").replace(/\./g, "").replace(",", ".")
  );
}