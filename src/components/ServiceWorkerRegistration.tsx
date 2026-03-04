"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => {
          // SW登録成功
        })
        .catch((error) => {
          console.error("[SW] 登録失敗:", error);
        });
    }
  }, []);

  return null;
}
