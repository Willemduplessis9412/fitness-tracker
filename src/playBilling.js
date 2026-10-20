import { Capacitor } from "@capacitor/core";
import { NativePurchases, PURCHASE_TYPE } from "@capgo/native-purchases";

// The "Remove ads" monthly subscription. Android: Play Console -> Monetise with Play -> Products ->
// Subscriptions (product + base plan). iOS: App Store Connect -> Subscriptions, product ID
// "remove_ads" (the plan ID is Android-only). IDs must match the consoles exactly.
const AD_FREE_PRODUCT_ID = "remove_ads";
const AD_FREE_PLAN_ID = "monthly";

const PURCHASED = "1"; // Google Play Billing's Purchase.PurchaseState.PURCHASED

// Android reports purchaseState; the App Store reports isActive for subscriptions instead.
const isAdFreePurchase = (p) =>
  p.productIdentifier === AD_FREE_PRODUCT_ID && (p.purchaseState === PURCHASED || p.isActive === true);

/** Google refunds subscriptions that aren't acknowledged within 3 days. The plugin acknowledges
 *  new purchases itself, but one interrupted mid-flow (app killed, no network) can slip through,
 *  so catch those up whenever we check. */
async function acknowledgeIfNeeded(purchase) {
  if (Capacitor.getPlatform() !== "android") return; // the App Store has no acknowledgement step
  if (purchase.isAcknowledged !== false || !purchase.purchaseToken) return;
  try {
    await NativePurchases.acknowledgePurchase({ purchaseToken: purchase.purchaseToken });
  } catch {
    // Retried on the next check.
  }
}

/** True if this Google account has an active "Remove ads" subscription. Play only returns
 *  subscriptions that are currently active, so a cancelled one drops out once its paid period
 *  ends. Best-effort: any billing failure counts as "not ad-free" rather than breaking the app. */
export async function hasAdFreeSubscription() {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { purchases } = await NativePurchases.getPurchases({
      productType: PURCHASE_TYPE.SUBS,
      onlyCurrentEntitlements: true, // iOS: only this Apple ID's live subscriptions
    });
    const active = purchases.filter(isAdFreePurchase);
    await Promise.all(active.map(acknowledgeIfNeeded));
    return active.length > 0;
  } catch {
    return false;
  }
}

/** The subscription's localized price (e.g. "R19.99"), or null if Play can't load it. */
export async function getAdFreePrice() {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const { products } = await NativePurchases.getProducts({
      productIdentifiers: [AD_FREE_PRODUCT_ID],
      productType: PURCHASE_TYPE.SUBS,
    });
    return products[0]?.priceString || null;
  } catch {
    return null;
  }
}

/** Opens Google Play's purchase sheet. Resolves true once the subscription is active, false if
 *  the user backed out; throws on a real billing error so the caller can show it. */
export async function buyAdFreeSubscription() {
  try {
    const purchase = await NativePurchases.purchaseProduct({
      productIdentifier: AD_FREE_PRODUCT_ID,
      planIdentifier: AD_FREE_PLAN_ID,
      productType: PURCHASE_TYPE.SUBS,
    });
    return isAdFreePurchase(purchase);
  } catch (e) {
    if (/cancel/i.test(e?.message || e?.code || "")) return false;
    throw e;
  }
}

/** Re-syncs purchases made on another device or before a reinstall (required by App Review),
 *  then reports whether the subscription is active. */
export async function restoreAdFreeSubscription() {
  try {
    await NativePurchases.restorePurchases();
  } catch {
    // Fall through to the check below, which reads whatever the store already has.
  }
  return hasAdFreeSubscription();
}

/** Opens the store's own subscription page (Google Play / App Store), where the user can cancel. */
export async function manageAdFreeSubscription() {
  try {
    await NativePurchases.manageSubscriptions();
  } catch {
    window.open(
      Capacitor.getPlatform() === "ios"
        ? "https://apps.apple.com/account/subscriptions"
        : "https://play.google.com/store/account/subscriptions?package=fitdata.fit",
      "_blank"
    );
  }
}
