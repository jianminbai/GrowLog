"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { CSRF_COOKIE_NAME } from "@/modules/auth/auth-constants";

import { confirmRecordDeletion } from "../../../_components/confirm-delete";
import { OptionalFields } from "../../../_components/optional-fields";

export type EmotionDto = {
  id: string;
  mood: "HAPPY" | "CALM" | "ANXIOUS" | "SAD" | "ANGRY" | "MIXED" | "OTHER";
  tags: string[];
  context: string | null;
  durationMinutes: number | null;
  peerInteraction: string | null;
  parentInteraction: string | null;
  notes: string | null;
  occurredAt: string;
  source: string;
  deletedAt: string | null;
};

export const moodLabels: Record<EmotionDto["mood"], string> = {
  HAPPY: "😊 开心", CALM: "🙂 平静", ANXIOUS: "😟 焦虑表现", SAD: "😢 难过",
  ANGRY: "😠 愤怒", MIXED: "😶 多种情绪", OTHER: "📝 其他"
};

const csrf = () => decodeURIComponent(document.cookie.split("; ")
  .find((cookie) => cookie.startsWith(`${CSRF_COOKIE_NAME}=`))?.split("=")[1] ?? "");
const local = (value: string) => {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};
const textOrNull = (form: FormData, field: string) => String(form.get(field) ?? "").trim() || null;

export function EmotionForm({ childId, record }: { childId: string; record?: EmotionDto }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [messageRole, setMessageRole] = useState<"status" | "alert">("status");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const duration = String(form.get("durationMinutes") ?? "");
    const payload = {
      mood: String(form.get("mood")),
      tags: String(form.get("tags") ?? "").split(/[,，]/).map((tag) => tag.trim()).filter(Boolean),
      context: textOrNull(form, "context"),
      durationMinutes: duration === "" ? null : Number(duration),
      peerInteraction: textOrNull(form, "peerInteraction"),
      parentInteraction: textOrNull(form, "parentInteraction"),
      notes: textOrNull(form, "notes"),
      occurredAt: new Date(String(form.get("occurredAt"))).toISOString(),
      source: String(form.get("source"))
    };
    try {
      const response = await fetch(record
        ? `/api/children/${childId}/emotions/${record.id}`
        : `/api/children/${childId}/emotions`, {
        method: record ? "PATCH" : "POST",
        headers: { "content-type": "application/json", "x-csrf-token": csrf() },
        body: JSON.stringify(payload)
      });
      if (!response.ok) { setMessageRole("alert"); setMessage((await response.json())?.error?.message ?? "保存失败。"); }
      else {
        setMessageRole("status"); setMessage(record ? "记录已更新。" : "记录已添加。");
        if (!record) formElement.reset();
        router.refresh();
      }
    } catch {
      setMessageRole("alert"); setMessage("暂时无法保存，请稍后重试。");
    } finally { setPending(false); }
  }

  async function lifecycle(action: "delete" | "restore") {
    if (action === "delete" && !confirmRecordDeletion("情绪记录")) return;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(
        `/api/children/${childId}/emotions/${record!.id}${action === "restore" ? "/restore" : ""}`,
        { method: action === "restore" ? "POST" : "DELETE", headers: { "x-csrf-token": csrf() } }
      );
      if (!response.ok) { setMessageRole("alert"); setMessage("操作失败。"); }
      else router.refresh();
    } catch {
      setMessageRole("alert"); setMessage("暂时无法完成操作，请稍后重试。");
    } finally { setPending(false); }
  }

  if (record?.deletedAt) return <div className="deleted-record">
    <span>{moodLabels[record.mood]} · {new Date(record.occurredAt).toLocaleString("zh-CN")}</span>
    <button type="button" disabled={pending} onClick={() => lifecycle("restore")}>恢复记录</button>
    {message ? <p className="form-message" role={messageRole}>{message}</p> : null}
  </div>;

  const showOptionalFields = Boolean(record && (
    record.context || record.durationMinutes !== null || record.peerInteraction
      || record.parentInteraction || record.notes || record.source !== "HOME"
  ));

  return <form className="growth-form" onSubmit={submit}>
    <div className="form-grid">
      <label>总体情绪<select name="mood" defaultValue={record?.mood ?? "CALM"}>{Object.entries(moodLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>发生时间<input type="datetime-local" name="occurredAt" required defaultValue={local(record?.occurredAt ?? new Date().toISOString())} /></label>
      <label>标签（逗号分隔）<input name="tags" maxLength={500} placeholder="如：入园，同伴互动" defaultValue={record?.tags.join("，") ?? ""} /></label>
    </div>
    <OptionalFields defaultOpen={showOptionalFields}>
      <div className="form-grid">
        <label>持续时间（分钟）<input type="number" name="durationMinutes" min="1" max="1440" step="1" defaultValue={record?.durationMinutes ?? ""} /></label>
        <label>情境<input name="context" maxLength={500} placeholder="如：早晨入园" defaultValue={record?.context ?? ""} /></label>
        <label>与同伴互动<input name="peerInteraction" maxLength={500} defaultValue={record?.peerInteraction ?? ""} /></label>
        <label>亲子互动<input name="parentInteraction" maxLength={500} defaultValue={record?.parentInteraction ?? ""} /></label>
        <label>来源 / 场景<select name="source" defaultValue={record?.source ?? "HOME"}><option value="HOME">家庭</option><option value="KINDERGARTEN">幼儿园</option><option value="MANUAL">其他手工记录</option><option value="HOSPITAL">医院</option><option value="IMPORT">导入</option></select></label>
      </div>
      <label>家长观察备注<textarea name="notes" rows={3} maxLength={2000} defaultValue={record?.notes ?? ""} /></label>
    </OptionalFields>
    <p className="care-note">这些记录只用于回顾观察频次和情境，不能用于诊断心理或神经发育状况。</p>
    {message ? <p className="form-message" role={messageRole}>{message}</p> : null}
    <div className="record-actions">
      <button className="primary-action profile-submit" disabled={pending}>{pending ? "处理中…" : record ? "保存修改" : "添加情绪记录"}</button>
      {record ? <button className="danger-action" type="button" disabled={pending} onClick={() => lifecycle("delete")}>删除记录</button> : null}
    </div>
  </form>;
}
