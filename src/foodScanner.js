import { Capacitor } from "@capacitor/core";
import { BarcodeScanner, BarcodeFormat } from "@capacitor-mlkit/barcode-scanning";

const FOOD_BARCODE_FORMATS = [BarcodeFormat.Ean13, BarcodeFormat.Ean8, BarcodeFormat.UpcA, BarcodeFormat.UpcE];

/** Opens the native ready-to-use scanning UI and resolves the scanned digits, or null if the
 *  user cancelled. Native-only -- callers on web fall back to manual barcode entry.
 *  Throws Error("SCANNER_MODULE_INSTALLING") the first time a device needs to download
 *  Google's barcode scanner module -- callers should ask the user to retry shortly after. */
export async function scanProductBarcode() {
  if (!Capacitor.isNativePlatform()) return null;
  const { available } = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
  if (!available) {
    await BarcodeScanner.installGoogleBarcodeScannerModule();
    throw new Error("SCANNER_MODULE_INSTALLING");
  }
  const { barcodes } = await BarcodeScanner.scan({ formats: FOOD_BARCODE_FORMATS });
  return barcodes[0]?.displayValue || null;
}

/** Looks up a scanned barcode against Open Food Facts' free public database (no API key) and
 *  returns per-100g macros in the same shape as FOOD_DB entries, or null if not found. */
export async function lookupProductByBarcode(barcode) {
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=product_name,brands,nutriments`
  );
  if (!res.ok) throw new Error("LOOKUP_FAILED");
  const data = await res.json();
  if (data.status !== 1 || !data.product) return null;

  const n = data.product.nutriments || {};
  // Some products only list energy in kJ -- 1 kcal = 4.184 kJ.
  const cal = n["energy-kcal_100g"] ?? (n["energy_100g"] != null ? n["energy_100g"] / 4.184 : null);
  if (cal == null) return null;

  return {
    name: data.product.product_name || data.product.brands || `Product ${barcode}`,
    cal: Math.round(cal),
    p: Math.round((n["proteins_100g"] || 0) * 10) / 10,
    c: Math.round((n["carbohydrates_100g"] || 0) * 10) / 10,
    f: Math.round((n["fat_100g"] || 0) * 10) / 10,
  };
}
