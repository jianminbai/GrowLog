"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { CSRF_COOKIE_NAME } from "@/modules/auth/auth-constants";

function csrfToken() {
  const value = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${CSRF_COOKIE_NAME}=`))
    ?.split("=")[1];
  return value ? decodeURIComponent(value) : "";
}

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function logout() {
    setPending(true);
    setMessage("");

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "x-csrf-token": csrfToken() }
      });

      if (!response.ok) {
        setMessage("暂时无法退出，请稍后重试。");
        return;
      }

      router.replace("/login");
      router.refresh();
    } catch {
      setMessage("暂时无法退出，请稍后重试。");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="logout-control">
      <button className="logout-button" type="button" disabled={pending} onClick={logout}>
        {pending ? "正在退出…" : "退出登录"}
      </button>
      {message ? <p className="form-message" role="alert">{message}</p> : null}
    </div>
  );
}
