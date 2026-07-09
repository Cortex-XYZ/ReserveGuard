import { formatEther } from "viem";

export function formatMon(value: bigint) {
  const numericValue = Number(formatEther(value));
  const formattedValue = numericValue.toLocaleString(undefined, {
    maximumFractionDigits: 4,
  });

  return `${formattedValue} MON`;
}

export function formatDip(value: boolean) {
  return value ? "true" : "false";
}
