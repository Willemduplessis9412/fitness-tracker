import React from "react";
import ReactDOM from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import App from "../fitness-tracker.jsx";

// iOS app: draw edge to edge and expose the notch / Dynamic Island height as
// env(safe-area-inset-*), which the ft-ios CSS rules use to keep controls clear of it.
if (Capacitor.getPlatform() === "ios") {
  document.documentElement.classList.add("ft-ios");
  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport && !viewport.content.includes("viewport-fit")) viewport.content += ", viewport-fit=cover";
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
