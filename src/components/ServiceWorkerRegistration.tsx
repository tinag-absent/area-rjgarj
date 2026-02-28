"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("[SW] 登録成功:", registration.scope);
        })
        .catch((error) => {
          console.error("[SW] 登録失敗:", error);
        });
    }
  }, []);

  return null;
}
