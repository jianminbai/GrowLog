"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { CSRF_COOKIE_NAME } from "@/modules/auth/auth-constants";

function csrfToken(): string {
  const value = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${CSRF_COOKIE_NAME}=`))
    ?.slice(CSRF_COOKIE_NAME.length + 1);
  return value ? decodeURIComponent(value) : "";
}

export function RestoreDeletedRecordButton({ endpoint, label }: { endpoint: string; label: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function restore() {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "x-csrf-token": csrfToken() }
      });
      if (!response.ok) {
        setMessage("恢复失败，请稍后重试。");
        return;
      }
      router.refresh();
    } catch {
      setMessage("暂时无法恢复，请稍后重试。");
    } finally {
      setPending(false);
    }
  }

  return <div className="restore-control">
    <button className="restore-action" type="button" aria-label={`恢复${label}`} disabled={pending} onClick={restore}>
      {pending ? "正在恢复…" : "恢复记录"}
    </button>
    {message ? <p className="form-message" role="alert">{message}</p> : null}
  </div>;
}
