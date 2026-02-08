/**
 * Formatting utilities for the API Marketplace frontend.
 * Centralizes currency formatting, date formatting, and other display helpers.
 */

/**
 * Convert paise (integer) to INR display string.
 * The backend stores amounts in paise (1 INR = 100 paise).
 *
 * @param paise - Amount in paise (e.g., 99900 for ₹999)
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted string like "999" or "999.00"
 */
export function paiseToRupees(paise: number, decimals = 0): string {
  return (paise / 100).toFixed(decimals);
}

/**
 * Format paise as a full currency string with ₹ symbol.
 *
 * @param paise - Amount in paise
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted string like "₹999" or "₹999.00"
 */
export function formatINR(paise: number, decimals = 0): string {
  return `₹${paiseToRupees(paise, decimals)}`;
}

/**
 * Format a plan price for display.
 * Shows "Free" for free-tier plans, otherwise "₹X /mo".
 *
 * @param priceMonthly - Price in paise (nullable)
 * @param freeTier - Whether the plan is free
 * @returns Display string like "Free" or "₹999 /mo"
 */
export function formatPlanPrice(
  priceMonthly: number | null | undefined,
  freeTier?: boolean
): string {
  if (freeTier || !priceMonthly) return "Free";
  return `${formatINR(priceMonthly)} /mo`;
}

/**
 * Format a commission rate as a percentage.
 *
 * @param rate - Commission rate (0-1, e.g., 0.1 for 10%)
 * @returns Formatted string like "10%"
 */
export function formatPercent(rate: number, decimals = 0): string {
  return `${(rate * 100).toFixed(decimals)}%`;
}
