import { Capacitor } from "@capacitor/core";
import { AdMob, BannerAdPosition, BannerAdSize } from "@capacitor-community/admob";

// Fit Data's own AdMob app (registered under the same ca-app-pub-8770927231193896
// publisher account as King of the Hill, but a separate app/ad units).
const BANNER_AD_UNIT_ID = "ca-app-pub-8770927231193896/1954537420";
const INTERSTITIAL_AD_UNIT_ID = "ca-app-pub-8770927231193896/1272011141";

let initialized = false;
let interstitialShownThisSession = false;

/** Initializes the Google Mobile Ads SDK once, at app startup. No-ops on web -- the Play
 *  Store build is free/ad-supported, the web build stays subscription-only via Paystack. */
export async function initAdMob() {
  if (!Capacitor.isNativePlatform() || initialized) return;
  initialized = true;
  await AdMob.initialize();
}

/** Shows the persistent footer banner. Best-effort -- a failed/unavailable banner should
 *  never block the rest of the app. */
export async function showFooterBanner() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await AdMob.showBanner({
      adId: BANNER_AD_UNIT_ID,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
    });
  } catch {
    // Best-effort, see above.
  }
}

export async function hideFooterBanner() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await AdMob.removeBanner();
  } catch {
    // Best-effort, see above.
  }
}

/** Shows at most one full-screen interstitial per app session, rather than on every action --
 *  Fit Data's core loop is logging food/workouts/steps several times a day, so firing an
 *  interstitial on every save would be far too disruptive. */
export async function showSessionInterstitial() {
  if (!Capacitor.isNativePlatform() || interstitialShownThisSession) return;
  interstitialShownThisSession = true;
  try {
    await AdMob.prepareInterstitial({ adId: INTERSTITIAL_AD_UNIT_ID });
    await AdMob.showInterstitial();
  } catch {
    // Best-effort, see above.
  }
}
