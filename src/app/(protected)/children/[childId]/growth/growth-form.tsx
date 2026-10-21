"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { CSRF_COOKIE_NAME } from "@/modules/auth/auth-constants";
import type { GrowthMeasurementDto } from "@/modules/growth/growth-handlers";

function csrfToken(): string {
  const value = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${CSRF_COOKIE_NAME}=`))
    ?.split("=")[1];
  return value ? decodeURIComponent(value) : "";
}

function optionalNumber(form: FormData, name: string): number | null {
  const value = String(form.get(name) ?? "").trim();
  return value === "" ? null : Number(value);
}

function optionalText(form: FormData, name: string): string | null {
  const value = String(form.get(name) ?? "").trim();
  return value === "" ? null : value;
}

function localDateTime(value: string): string {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function GrowthForm({ childId, measurement }: { childId: string; measurement?: GrowthMeasurementDto }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const editing = Boolean(measurement);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const measuredAt = String(form.get("measuredAt") ?? "");
    const payload = {
      measuredAt: new Date(measuredAt).toISOString(),
      heightCm: optionalNumber(form, "heightCm"),
      weightKg: optionalNumber(form, "weightKg"),
      headCircumferenceCm: optionalNumber(form, "headCircumferenceCm"),
      source: String(form.get("source") ?? "MANUAL"),
      place: optionalText(form, "place"),
      method: optionalText(form, "method"),
      device: optionalText(form, "device"),
      precisionNote: optionalText(form, "precisionNote"),
      notes: optionalText(form, "notes")
    };
    try {
      const endpoint = editing
        ? `/api/children/${childId}/growth/${measurement!.id}`
        : `/api/children/${childId}/growth`;
      const response = await fetch(endpoint, {
        method: editing ? "PATCH" : "POST",
        headers: { "content-type": "application/json", "x-csrf-token": csrfToken() },
        body: JSON.stringify(payload)
      });
      const body = await response.json();
      if (!response.ok) {
        setMessage(body?.error?.message ?? "测量记录保存失败。");
        return;
      }
      setMessage(editing ? "记录已更新。" : "记录已添加。");
      if (!editing) event.currentTarget.reset();
      router.refresh();
    } catch {
      setMessage("暂时无法保存，请稍后重试。");
    } finally {
      setPending(false);
    }
  }

  async function changeDeletedState(action: "delete" | "restore") {
    setPending(true);
    setMessage("");
    const endpoint = `/api/children/${childId}/growth/${measurement!.id}${action === "restore" ? "/restore" : ""}`;
    try {
      const response = await fetch(endpoint, {
        method: action === "restore" ? "POST" : "DELETE",
        headers: { "x-csrf-token": csrfToken() }
      });
      if (!response.ok) {
        const body = await response.json();
        setMessage(body?.error?.message ?? "操作失败。");
        return;
      }
      router.refresh();
    } catch {
      setMessage("暂时无法完成操作，请稍后重试。");
    } finally {
      setPending(false);
    }
  }

  if (measurement?.deletedAt) {
    return (
      <div className="deleted-record">
        <span>{new Date(measurement.measuredAt).toLocaleString("zh-CN")}</span>
        <button type="button" disabled={pending} onClick={() => changeDeletedState("restore")}>恢复记录</button>
        {message ? <p className="form-message">{message}</p> : null}
      </div>
    );
  }

  return (
    <form className="growth-form" onSubmit={submit}>
      <div className="form-grid">
        <label>测量时间<input name="measuredAt" type="datetime-local" required defaultValue={localDateTime(measurement?.measuredAt ?? new Date().toISOString())} /></label>
        <label>来源<select name="source" defaultValue={measurement?.source ?? "HOME"}>
          <option value="HOME">家庭</option><option value="HOSPITAL">医院</option><option value="KINDERGARTEN">幼儿园</option><option value="MANUAL">手工录入</option><option value="IMPORT">导入</option>
        </select></label>
        <label>身高（cm）<input name="heightCm" type="number" min="0.01" max="250" step="0.01" defaultValue={measurement?.heightCm ?? ""} /></label>
        <label>体重（kg）<input name="weightKg" type="number" min="0.001" max="300" step="0.001" defaultValue={measurement?.weightKg ?? ""} /></label>
        <label>头围（cm）<input name="headCircumferenceCm" type="number" min="0.01" max="100" step="0.01" defaultValue={measurement?.headCircumferenceCm ?? ""} /></label>
        <label>地点<input name="place" maxLength={120} defaultValue={measurement?.place ?? ""} /></label>
        <label>方法<input name="method" maxLength={120} defaultValue={measurement?.method ?? ""} /></label>
        <label>设备<input name="device" maxLength={120} defaultValue={measurement?.device ?? ""} /></label>
        <label>精度说明<input name="precisionNote" maxLength={240} defaultValue={measurement?.precisionNote ?? ""} /></label>
      </div>
      <label>备注<textarea name="notes" rows={3} maxLength={2000} defaultValue={measurement?.notes ?? ""} /></label>
      {message ? <p className="form-message" role="status">{message}</p> : null}
      <div className="record-actions">
        <button className="primary-action profile-submit" type="submit" disabled={pending}>{pending ? "处理中…" : editing ? "保存修改" : "添加测量"}</button>
        {editing ? <button className="danger-action" type="button" disabled={pending} onClick={() => changeDeletedState("delete")}>删除记录</button> : null}
      </div>
    </form>
  );
}
