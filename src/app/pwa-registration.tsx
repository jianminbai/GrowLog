"use client";

import { useEffect } from "react";

export function PwaRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let refreshing = false;
    const refresh = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    const check = () => navigator.serviceWorker.getRegistration().then((registration) => registration?.update());
    const register = () => navigator.serviceWorker.register("/sw.js", { scope: "/" }).then(() => check());
    window.addEventListener("load", register, { once: true });
    navigator.serviceWorker.addEventListener("controllerchange", refresh);
    document.addEventListener("visibilitychange", check);
    return () => {
      window.removeEventListener("load", register);
      navigator.serviceWorker.removeEventListener("controllerchange", refresh);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);
  return null;
}
