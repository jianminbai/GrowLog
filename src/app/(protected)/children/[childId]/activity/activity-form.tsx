"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { CSRF_COOKIE_NAME } from "@/modules/auth/auth-constants";

export type ActivityDto = {
  id: string;
  activityType: string;
  durationMinutes: number;
  outdoorMinutes: number | null;
  intensity: "LIGHT" | "MODERATE" | "VIGOROUS";
  structure: "FREE_PLAY" | "STRUCTURED" | "MIXED";
  occurredAt: string;
  engagement: string | null;
  notes: string | null;
  source: string;
  deletedAt: string | null;
};

const csrf = () => decodeURIComponent(document.cookie.split("; ")
  .find((cookie) => cookie.startsWith(`${CSRF_COOKIE_NAME}=`))?.split("=")[1] ?? "");
const local = (value: string) => {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

export function ActivityForm({ childId, record }: { childId: string; record?: ActivityDto }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const outdoor = String(form.get("outdoorMinutes") ?? "");
    const payload = {
      activityType: String(form.get("activityType") ?? ""),
      durationMinutes: Number(form.get("durationMinutes")),
      outdoorMinutes: outdoor === "" ? null : Number(outdoor),
      intensity: String(form.get("intensity")),
      structure: String(form.get("structure")),
      occurredAt: new Date(String(form.get("occurredAt"))).toISOString(),
      engagement: String(form.get("engagement") ?? "").trim() || null,
      notes: String(form.get("notes") ?? "").trim() || null,
      source: String(form.get("source"))
    };
    const response = await fetch(record
      ? `/api/children/${childId}/activities/${record.id}`
      : `/api/children/${childId}/activities`, {
      method: record ? "PATCH" : "POST",
      headers: { "content-type": "application/json", "x-csrf-token": csrf() },
      body: JSON.stringify(payload)
    });
    if (!response.ok) setMessage((await response.json())?.error?.message ?? "保存失败。");
    else {
      setMessage(record ? "记录已更新。" : "记录已添加。");
      if (!record) event.currentTarget.reset();
      router.refresh();
    }
    setPending(false);
  }

  async function lifecycle(action: "delete" | "restore") {
    setPending(true);
    setMessage("");
    const response = await fetch(
      `/api/children/${childId}/activities/${record!.id}${action === "restore" ? "/restore" : ""}`,
      { method: action === "restore" ? "POST" : "DELETE", headers: { "x-csrf-token": csrf() } }
    );
    if (!response.ok) setMessage("操作失败。");
    else router.refresh();
    setPending(false);
  }

  if (record?.deletedAt) return <div className="deleted-record">
    <span>{record.activityType} · {record.durationMinutes} 分钟</span>
    <button disabled={pending} onClick={() => lifecycle("restore")}>恢复记录</button>
  </div>;

  return <form className="growth-form" onSubmit={submit}>
    <div className="form-grid">
      <label>活动类型<input name="activityType" required maxLength={100} placeholder="如：骑车、跑步、攀爬" defaultValue={record?.activityType ?? ""} /></label>
      <label>发生时间<input type="datetime-local" name="occurredAt" required defaultValue={local(record?.occurredAt ?? new Date().toISOString())} /></label>
      <label>活动总时长（分钟）<input type="number" name="durationMinutes" required min="1" max="1440" step="1" defaultValue={record?.durationMinutes ?? 30} /></label>
      <label>其中户外时长（分钟）<input type="number" name="outdoorMinutes" min="0" max="1440" step="1" defaultValue={record?.outdoorMinutes ?? ""} /></label>
      <label>强度<select name="intensity" defaultValue={record?.intensity ?? "LIGHT"}><option value="LIGHT">轻强度</option><option value="MODERATE">中等强度</option><option value="VIGOROUS">高强度</option></select></label>
      <label>组织形式<select name="structure" defaultValue={record?.structure ?? "FREE_PLAY"}><option value="FREE_PLAY">自由玩耍</option><option value="STRUCTURED">结构化活动/课程</option><option value="MIXED">混合</option></select></label>
      <label>来源 / 场景<select name="source" defaultValue={record?.source ?? "HOME"}><option value="HOME">家庭</option><option value="KINDERGARTEN">幼儿园</option><option value="MANUAL">其他手工记录</option><option value="HOSPITAL">医院</option><option value="IMPORT">导入</option></select></label>
      <label>参与表现<input name="engagement" maxLength={200} placeholder="可选，如：主动参与" defaultValue={record?.engagement ?? ""} /></label>
    </div>
    <label>备注<textarea name="notes" rows={3} maxLength={2000} defaultValue={record?.notes ?? ""} /></label>
    <p className="care-note">户外时长和运动强度分别记录；户外活动不会自动计为中高强度运动。</p>
    {message ? <p className="form-message">{message}</p> : null}
    <div className="record-actions">
      <button className="primary-action profile-submit" disabled={pending}>{pending ? "处理中…" : record ? "保存修改" : "添加活动"}</button>
      {record ? <button className="danger-action" type="button" disabled={pending} onClick={() => lifecycle("delete")}>删除记录</button> : null}
    </div>
  </form>;
}
