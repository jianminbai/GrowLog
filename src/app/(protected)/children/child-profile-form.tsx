"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { CSRF_COOKIE_NAME } from "@/modules/auth/auth-constants";
import type { ChildProfileDto } from "@/modules/children/child-handlers";

function csrfToken(): string {
  const prefix = `${CSRF_COOKIE_NAME}=`;
  const value = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(prefix))
    ?.slice(prefix.length);
  return value ? decodeURIComponent(value) : "";
}

function optionalNumber(form: FormData, name: string): number | null {
  const value = String(form.get(name) ?? "").trim();
  return value === "" ? null : Number(value);
}

export function ChildProfileForm({ child }: { child?: ChildProfileDto }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const editing = Boolean(child);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") ?? ""),
      birthDate: String(form.get("birthDate") ?? ""),
      sex: String(form.get("sex") ?? "UNSPECIFIED"),
      birthHeightCm: optionalNumber(form, "birthHeightCm"),
      birthWeightKg: optionalNumber(form, "birthWeightKg"),
      motherHeightCm: optionalNumber(form, "motherHeightCm"),
      fatherHeightCm: optionalNumber(form, "fatherHeightCm"),
      notes: String(form.get("notes") ?? "") || null
    };

    try {
      const response = await fetch(editing ? `/api/children/${child!.id}` : "/api/children", {
        method: editing ? "PATCH" : "POST",
        headers: { "content-type": "application/json", "x-csrf-token": csrfToken() },
        body: JSON.stringify(payload)
      });
      const body = await response.json();
      if (!response.ok) {
        setMessage(body?.error?.message ?? "档案保存失败，请检查输入。");
        return;
      }
      if (editing) {
        setMessage("档案已更新。");
        router.refresh();
      } else {
        router.push(`/children/${body.data.child.id}`);
      }
    } catch {
      setMessage("暂时无法保存，请稍后重试。");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="profile-form" onSubmit={submit}>
      <div className="form-grid">
        <label>
          姓名
          <input name="name" required maxLength={80} defaultValue={child?.name ?? ""} />
        </label>
        <label>
          出生日期
          <input name="birthDate" type="date" required defaultValue={child?.birthDate ?? ""} />
        </label>
        <label>
          生理性别
          <select name="sex" defaultValue={child?.sex ?? "UNSPECIFIED"}>
            <option value="UNSPECIFIED">暂不填写</option>
            <option value="FEMALE">女</option>
            <option value="MALE">男</option>
          </select>
        </label>
        <label>
          出生身高（cm）
          <input name="birthHeightCm" type="number" min="0.01" max="100" step="0.01" defaultValue={child?.birthHeightCm ?? ""} />
        </label>
        <label>
          出生体重（kg）
          <input name="birthWeightKg" type="number" min="0.001" max="20" step="0.001" defaultValue={child?.birthWeightKg ?? ""} />
        </label>
        <label>
          母亲身高（cm）
          <input name="motherHeightCm" type="number" min="0.01" max="250" step="0.01" defaultValue={child?.motherHeightCm ?? ""} />
        </label>
        <label>
          父亲身高（cm）
          <input name="fatherHeightCm" type="number" min="0.01" max="250" step="0.01" defaultValue={child?.fatherHeightCm ?? ""} />
        </label>
      </div>
      <label>
        备注
        <textarea name="notes" maxLength={2000} rows={4} defaultValue={child?.notes ?? ""} />
      </label>
      {message ? <p className="form-message" role="status">{message}</p> : null}
      <button className="primary-action profile-submit" type="submit" disabled={pending}>
        {pending ? "正在保存…" : editing ? "保存修改" : "建立档案"}
      </button>
    </form>
  );
}
