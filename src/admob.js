import { Capacitor } from "@capacitor/core";
import { AdMob, BannerAdPosition, BannerAdSize } from "@capacitor-community/admob";

// Fit Data's own AdMob apps (registered under the same ca-app-pub-8770927231193896
// publisher account as King of the Hill, but separate apps/ad units per platform).
const AD_UNITS = {
  android: {
    banner: "ca-app-pub-8770927231193896/1954537420",
    interstitial: "ca-app-pub-8770927231193896/1272011141",
  },
  // TODO: replace with the FitData iOS ad units from AdMob before the App Store release --
  // these are Google's official iOS test units (safe to ship, but earn nothing).
  ios: {
    banner: "ca-app-pub-3940256099942544/2934735716",
    interstitial: "ca-app-pub-3940256099942544/4411468910",
  },
};
const units = () => AD_UNITS[Capacitor.getPlatform()] || AD_UNITS.android;

let initialized = false;
let interstitialShownThisSession = false;

/** Initializes the Google Mobile Ads SDK once, at app startup. No-ops on web -- the Play
 *  Store build is free/ad-supported, the web build stays subscription-only via Paystack. */
export async function initAdMob() {
  if (!Capacitor.isNativePlatform() || initialized) return;
  initialized = true;
  // iOS requires asking for App Tracking Transparency permission before personalised ads.
  // Declining is fine -- ads still show, just non-personalised.
  if (Capacitor.getPlatform() === "ios") {
    try {
      const { status } = await AdMob.trackingAuthorizationStatus();
      if (status === "notDetermined") await AdMob.requestTrackingAuthorization();
    } catch {
      // Best-effort, see below.
    }
  }
  await AdMob.initialize();
}

/** Shows the persistent footer banner. Best-effort -- a failed/unavailable banner should
 *  never block the rest of the app. */
export async function showFooterBanner() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await AdMob.showBanner({
      adId: units().banner,
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
    await AdMob.prepareInterstitial({ adId: units().interstitial });
    await AdMob.showInterstitial();
  } catch {
    // Best-effort, see above.
  }
}
