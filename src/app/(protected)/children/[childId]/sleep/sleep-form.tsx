"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { CSRF_COOKIE_NAME } from "@/modules/auth/auth-constants";

type SleepDto = {
  id: string; kind: "NIGHT" | "NAP"; startedAt: string; endedAt: string;
  awakeMinutes: number | null; wakeCount: number | null; observation: string | null;
  source: string; deletedAt: string | null; sleepMinutes: number;
};
const csrf = () => decodeURIComponent(document.cookie.split("; ").find((c) => c.startsWith(`${CSRF_COOKIE_NAME}=`))?.split("=")[1] ?? "");
const local = (value: string) => { const d = new Date(value); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
const numberOrNull = (form: FormData, name: string) => { const value = String(form.get(name) ?? ""); return value === "" ? null : Number(value); };

export function SleepForm({ childId, record }: { childId: string; record?: SleepDto }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      kind: String(form.get("kind")),
      startedAt: new Date(String(form.get("startedAt"))).toISOString(),
      endedAt: new Date(String(form.get("endedAt"))).toISOString(),
      awakeMinutes: numberOrNull(form, "awakeMinutes"), wakeCount: numberOrNull(form, "wakeCount"),
      observation: String(form.get("observation") ?? "").trim() || null,
      source: String(form.get("source"))
    };
    const response = await fetch(record ? `/api/children/${childId}/sleep/${record.id}` : `/api/children/${childId}/sleep`, {
      method: record ? "PATCH" : "POST", headers: { "content-type": "application/json", "x-csrf-token": csrf() }, body: JSON.stringify(payload)
    });
    if (!response.ok) setMessage((await response.json())?.error?.message ?? "保存失败。");
    else { setMessage(record ? "记录已更新。" : "记录已添加。"); if (!record) event.currentTarget.reset(); router.refresh(); }
    setPending(false);
  }
  async function lifecycle(action: "delete" | "restore") {
    setPending(true);
    const response = await fetch(`/api/children/${childId}/sleep/${record!.id}${action === "restore" ? "/restore" : ""}`, {
      method: action === "restore" ? "POST" : "DELETE", headers: { "x-csrf-token": csrf() }
    });
    if (!response.ok) setMessage("操作失败。"); else router.refresh();
    setPending(false);
  }
  if (record?.deletedAt) return <div className="deleted-record"><span>{new Date(record.endedAt).toLocaleString("zh-CN")} · {record.sleepMinutes} 分钟</span><button disabled={pending} onClick={() => lifecycle("restore")}>恢复记录</button></div>;
  const now = new Date(); const hourAgo = new Date(now.getTime() - 3600000);
  return <form className="growth-form" onSubmit={submit}>
    <div className="form-grid">
      <label>类型<select name="kind" defaultValue={record?.kind ?? "NIGHT"}><option value="NIGHT">夜间睡眠</option><option value="NAP">午睡/小睡</option></select></label>
      <label>开始时间<input type="datetime-local" name="startedAt" required defaultValue={local(record?.startedAt ?? hourAgo.toISOString())} /></label>
      <label>结束时间<input type="datetime-local" name="endedAt" required defaultValue={local(record?.endedAt ?? now.toISOString())} /></label>
      <label>清醒分钟<input type="number" name="awakeMinutes" min="0" step="1" defaultValue={record?.awakeMinutes ?? ""} /></label>
      <label>醒来次数<input type="number" name="wakeCount" min="0" max="100" step="1" defaultValue={record?.wakeCount ?? ""} /></label>
      <label>来源<select name="source" defaultValue={record?.source ?? "HOME"}><option value="HOME">家庭</option><option value="MANUAL">手工</option><option value="HOSPITAL">医院</option><option value="KINDERGARTEN">幼儿园</option><option value="IMPORT">导入</option></select></label>
    </div>
    <label>观察备注<textarea name="observation" rows={3} defaultValue={record?.observation ?? ""} /></label>
    {message ? <p className="form-message">{message}</p> : null}
    <div className="record-actions"><button className="primary-action profile-submit" disabled={pending}>{pending ? "处理中…" : record ? "保存修改" : "添加睡眠"}</button>{record ? <button className="danger-action" type="button" onClick={() => lifecycle("delete")}>删除记录</button> : null}</div>
  </form>;
}
