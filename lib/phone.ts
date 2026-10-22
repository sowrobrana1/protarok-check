// Phone-number helpers for Bangladeshi mobile numbers.

/** Normalize any common writing of a BD mobile number to 01XXXXXXXXX.
 *  Accepts: 01712345678, 8801712345678, +8801712345678, 01712-345 678.
 *  Also converts Bengali digits (০১৭…) to English digits.
 *  Returns null when the number is not a valid BD mobile number. */
export function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  const bn = "০১২৩৪৫৬৭৮৯";
  let s = String(raw).replace(/[০-৯]/g, (c) => String(bn.indexOf(c)));
  s = s.replace(/[\s\-()]/g, "");
  if (s.startsWith("+880")) s = "0" + s.slice(4);
  else if (s.startsWith("880")) s = "0" + s.slice(3);
  if (!/^01[3-9]\d{8}$/.test(s)) return null;
  return s;
}

/** Public display form: 017****678 (first 3 + last 3 digits only). */
export function maskPhone(phone: string): string {
  if (phone.length !== 11) return phone;
  return phone.slice(0, 3) + "****" + phone.slice(8);
}

/** Convert ASCII digits in a string to Bengali digits for display. */
export function toBn(input: string | number): string {
  const bn = "০১২৩৪৫৬৭৮৯";
  return String(input).replace(/[0-9]/g, (c) => bn[Number(c)]);
}

export type RiskLevel = "none" | "caution" | "high" | "disputed";

export function riskLevel(approvedCount: number, hasOpenDispute: boolean): RiskLevel {
  if (hasOpenDispute) return "disputed";
  if (approvedCount <= 0) return "none";
  if (approvedCount <= 2) return "caution";
  return "high";
}

export const RISK_LABEL: Record<RiskLevel, string> = {
  none: "কোনো যাচাইকৃত অভিযোগ নেই",
  caution: "সতর্ক থাকুন — অভিযোগ এসেছে",
  high: "উচ্চ ঝুঁকি — একাধিক যাচাইকৃত অভিযোগ",
  disputed: "আপত্তি পর্যালোচনাধীন",
};

export const CHANNELS: Record<string, string> = {
  bkash: "বিকাশ",
  nagad: "নগদ",
  rocket: "রকেট",
  bank: "ব্যাংক অ্যাকাউন্ট",
  p2p: "Binance P2P / ডলার কেনাবেচা",
  call: "ফোন কল / ভুয়া অফার",
  shop: "ভুয়া অনলাইন দোকান / পেজ",
  other: "অন্যান্য",
};

export const SCAM_TYPES: Record<string, string> = {
  advance: "অগ্রিম টাকা নিয়ে পণ্য পাঠায়নি",
  fake_offer: "ভুয়া অফার / লটারি / চাকরির লোভ",
  otp: "OTP / পিন জালিয়াতি",
  fake_official: "বিকাশ/ব্যাংক অফিস সেজে প্রতারণা",
  p2p: "P2P লেনদেনে প্রতারণা",
  fake_seller: "ভুয়া বিক্রেতা",
  other: "অন্যান্য প্রতারণা",
};
