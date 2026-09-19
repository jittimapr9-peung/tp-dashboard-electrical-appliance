import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const thbFormatter = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 2,
});

export function formatTHB(amount: number | null | undefined): string {
  if (amount == null) return "-";
  return thbFormatter.format(amount);
}

export function formatPercent(rate: number | null | undefined): string {
  if (rate == null) return "-";
  return `${(rate * 100).toFixed(2)}%`;
}

const monthFormatter = new Intl.DateTimeFormat("th-TH", {
  year: "numeric",
  month: "long",
  timeZone: "UTC",
});

export function formatMonth(date: Date | string | null | undefined): string {
  if (!date) return "-";
  return monthFormatter.format(new Date(date));
}
