import { formatInTimeZone } from "date-fns-tz";

export function formatMoney(cents: number, currency = "czk") {
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export function formatDateTime(d: Date, tz = "Europe/Prague") {
  return formatInTimeZone(d, tz, "d. M. yyyy HH:mm");
}

export function formatDate(d: Date, tz = "Europe/Prague") {
  return formatInTimeZone(d, tz, "d. M. yyyy");
}

export function formatTime(d: Date, tz = "Europe/Prague") {
  return formatInTimeZone(d, tz, "HH:mm");
}

const WEEKDAYS = ["neděle", "pondělí", "úterý", "středa", "čtvrtek", "pátek", "sobota"];
export function weekdayName(i: number) {
  return WEEKDAYS[i] ?? "";
}

export function minutesToHHMM(m: number) {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

export function hhmmToMinutes(s: string) {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function pluralLessons(n: number) {
  if (n === 1) return "lekce";
  if (n >= 2 && n <= 4) return "lekce";
  return "lekcí";
}

export function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
