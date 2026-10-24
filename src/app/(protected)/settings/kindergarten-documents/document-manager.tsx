"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";

import { CSRF_COOKIE_NAME } from "@/modules/auth/auth-constants";

type DocumentType = "DAILY_CARE_SHEET" | "WEEKLY_MENU";
const kindergartenDocumentTypes: DocumentType[] = ["DAILY_CARE_SHEET", "WEEKLY_MENU"];

type DocumentDto = {
  id: string;
  childId: string;
  type: DocumentType;
  periodStart: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
  imageUrl: string;
};

type UploadState = { date: string; file: File | null; previewUrl: string };
const emptyUpload = (): UploadState => ({ date: "", file: null, previewUrl: "" });

const labels: Record<DocumentType, { title: string; date: string; file: string; button: string; short: string }> = {
  DAILY_CARE_SHEET: {
    title: "上传每日保教单", date: "保教单日期", file: "选择保教单图片", button: "上传保教单", short: "保教单"
  },
  WEEKLY_MENU: {
    title: "上传每周菜单", date: "菜单日期", file: "选择菜单图片", button: "上传菜单", short: "菜单"
  }
};

function csrfToken(): string {
  const value = document.cookie.split("; ")
    .find((cookie) => cookie.startsWith(`${CSRF_COOKIE_NAME}=`))
    ?.slice(CSRF_COOKIE_NAME.length + 1);
  return value ? decodeURIComponent(value) : "";
}

function periodFor(type: DocumentType, dateValue: string): string {
  if (type === "DAILY_CARE_SHEET" || !/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return dateValue;
  const date = new Date(`${dateValue}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}

function sizeLabel(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function DocumentManager({ childOptions }: { childOptions: Array<{ id: string; name: string }> }) {
  const [childId, setChildId] = useState(childOptions[0]?.id ?? "");
  const [documents, setDocuments] = useState<DocumentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [uploads, setUploads] = useState<Record<DocumentType, UploadState>>({
    DAILY_CARE_SHEET: emptyUpload(), WEEKLY_MENU: emptyUpload()
  });
  const [pending, setPending] = useState<DocumentType | "delete" | null>(null);
  const [message, setMessage] = useState("");
  const [activeDocument, setActiveDocument] = useState<DocumentDto | null>(null);
  const [fileInputVersions, setFileInputVersions] = useState<Record<DocumentType, number>>({
    DAILY_CARE_SHEET: 0, WEEKLY_MENU: 0
  });
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previewsRef = useRef<string[]>([]);
  const childIdRef = useRef(childId);
  const requestGenerationRef = useRef(0);

  const loadDocuments = useCallback(async (requestedChildId: string) => {
    const generation = ++requestGenerationRef.current;
    setLoading(true);
    setLoadError("");
    try {
      const response = await fetch(`/api/kindergarten-documents?childId=${encodeURIComponent(requestedChildId)}`, { cache: "no-store" });
      if (!response.ok) throw new Error("load failed");
      const payload = await response.json() as { data: { documents: DocumentDto[] } };
      if (generation !== requestGenerationRef.current || requestedChildId !== childIdRef.current) return;
      setDocuments(payload.data.documents);
    } catch {
      if (generation !== requestGenerationRef.current || requestedChildId !== childIdRef.current) return;
      setLoadError("暂时无法读取资料，请稍后重试。");
    } finally {
      if (generation === requestGenerationRef.current && requestedChildId === childIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => { void loadDocuments(childId); }, [childId, loadDocuments]);
  useEffect(() => () => {
    for (const preview of previewsRef.current) URL.revokeObjectURL(preview);
  }, []);

  const closeViewer = useCallback(() => {
    const opener = openerRef.current;
    if (contentRef.current) {
      contentRef.current.removeAttribute("inert");
      contentRef.current.removeAttribute("aria-hidden");
    }
    setActiveDocument(null);
    opener?.focus();
  }, []);

  useEffect(() => {
    if (!activeDocument) return;
    const content = contentRef.current;
    content?.setAttribute("inert", "");
    content?.setAttribute("aria-hidden", "true");
    closeButtonRef.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeViewer();
        return;
      }
      if (event.key !== "Tab" || !viewerRef.current) return;
      const controls = [...viewerRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      )];
      if (controls.length === 0) return;
      const first = controls[0]!;
      const last = controls[controls.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", keydown);
      document.body.style.overflow = previousOverflow;
      content?.removeAttribute("inert");
      content?.removeAttribute("aria-hidden");
    };
  }, [activeDocument, closeViewer]);

  function changeChild(nextChildId: string) {
    requestGenerationRef.current += 1;
    childIdRef.current = nextChildId;
    setChildId(nextChildId);
    setDocuments([]);
    setLoadError("");
    setLoading(true);
    setMessage("");
    setActiveDocument(null);
    setUploads((current) => {
      for (const type of kindergartenDocumentTypes) {
        if (current[type].previewUrl) URL.revokeObjectURL(current[type].previewUrl);
      }
      return { DAILY_CARE_SHEET: emptyUpload(), WEEKLY_MENU: emptyUpload() };
    });
    setFileInputVersions((current) => ({
      DAILY_CARE_SHEET: current.DAILY_CARE_SHEET + 1,
      WEEKLY_MENU: current.WEEKLY_MENU + 1
    }));
  }

  function changeFile(type: DocumentType, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setUploads((current) => {
      if (current[type].previewUrl) URL.revokeObjectURL(current[type].previewUrl);
      const previewUrl = file ? URL.createObjectURL(file) : "";
      if (previewUrl) previewsRef.current.push(previewUrl);
      return { ...current, [type]: { ...current[type], file, previewUrl } };
    });
    setMessage("");
  }

  async function upload(type: DocumentType, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const state = uploads[type];
    if (!state.date || !state.file) {
      setMessage("请选择日期和图片。");
      return;
    }
    setPending(type);
    setMessage("");
    const body = new FormData();
    body.set("childId", childId);
    body.set("type", type);
    body.set("date", state.date);
    body.set("image", state.file);
    try {
      const response = await fetch("/api/kindergarten-documents", {
        method: "POST",
        headers: { "x-csrf-token": csrfToken() },
        body
      });
      if (!response.ok) throw new Error("upload failed");
      if (childIdRef.current !== childId) return;
      if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
      setUploads((current) => ({ ...current, [type]: { ...current[type], file: null, previewUrl: "" } }));
      setFileInputVersions((current) => ({ ...current, [type]: current[type] + 1 }));
      setMessage("上传成功");
      await loadDocuments(childId);
    } catch {
      setMessage("上传失败，请检查图片后重试。");
    } finally {
      setPending(null);
    }
  }

  async function remove(record: DocumentDto) {
    if (!window.confirm(`确认删除 ${record.periodStart} 的${labels[record.type].short}？`)) return;
    setPending("delete");
    setMessage("");
    try {
      const response = await fetch(`/api/kindergarten-documents/${encodeURIComponent(record.id)}`, {
        method: "DELETE",
        headers: { "x-csrf-token": csrfToken() }
      });
      if (!response.ok) throw new Error("delete failed");
      setMessage("已删除");
      await loadDocuments(childId);
    } catch {
      setMessage("删除失败，请稍后重试。");
    } finally {
      setPending(null);
    }
  }

  function openViewer(record: DocumentDto, opener: HTMLButtonElement) {
    openerRef.current = opener;
    setActiveDocument(record);
  }

  const uploadCard = (type: DocumentType) => {
    const state = uploads[type];
    const existing = state.date && documents.some((record) =>
      record.type === type && record.periodStart === periodFor(type, state.date));
    return <section className="document-upload-card" aria-label={labels[type].title}>
      <div className="document-upload-heading">
        <div><span>{type === "DAILY_CARE_SHEET" ? "每日" : "每周"}</span><h2>{labels[type].short}</h2></div>
        <small>{type === "DAILY_CARE_SHEET" ? "每天一份" : "每周一份"}</small>
      </div>
      <form onSubmit={(event) => void upload(type, event)}>
        <label>{labels[type].date}<input
          type="date"
          value={state.date}
          onChange={(event) => setUploads((current) => ({
            ...current, [type]: { ...current[type], date: event.target.value }
          }))}
          required
        /></label>
        <label>{labels[type].file}<input
          key={`${childId}-${type}-${fileInputVersions[type]}`}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => changeFile(type, event)}
          required
        /></label>
        {state.previewUrl ? <><Image
          className="document-upload-preview"
          src={state.previewUrl}
          alt={`${labels[type].short}上传预览`}
          width={640}
          height={480}
          unoptimized
        /><small className="document-file-summary">{state.file?.name} · {state.file ? sizeLabel(state.file.size) : ""}</small></> : null}
        {existing ? <p className="document-replace-warning">该{type === "DAILY_CARE_SHEET" ? "日期" : "周"}已有{labels[type].short}，上传后将替换原图。</p> : null}
        <button type="submit" disabled={pending !== null}>{pending === type ? "正在上传…" : labels[type].button}</button>
      </form>
    </section>;
  };

  return <div className="document-manager">
    <div ref={contentRef} data-testid="document-manager-content" className="document-manager-content">
    <label className="document-child-picker">选择孩子<select value={childId} disabled={pending !== null} onChange={(event) => changeChild(event.target.value)}>
      {childOptions.map((child) => <option value={child.id} key={child.id}>{child.name}</option>)}
    </select></label>
    <div className="document-upload-grid">{uploadCard("DAILY_CARE_SHEET")}{uploadCard("WEEKLY_MENU")}</div>
    {message ? <p className="form-message" role={message === "上传成功" || message === "已删除" ? "status" : "alert"}>{message}</p> : null}
    <section className="document-history" aria-labelledby="document-history-heading">
      <div className="document-history-heading"><div><span>已保存</span><h2 id="document-history-heading">资料记录</h2></div><strong>{documents.length}</strong></div>
      {loading ? <p className="empty-state">正在读取…</p> : loadError ? <p className="form-message" role="alert">{loadError}</p> : documents.length === 0
        ? <p className="empty-state">尚未上传保教单或菜单。</p>
        : <div className="document-history-grid">{documents.map((record) => <article className="document-card" key={record.id}>
          <button
            className="document-image-button"
            type="button"
            aria-label={`查看 ${record.periodStart} ${labels[record.type].short}`}
            onClick={(event) => openViewer(record, event.currentTarget)}
          >
            <Image className="document-thumbnail" src={record.imageUrl} alt={`${record.periodStart} ${labels[record.type].short}`} width={640} height={480} unoptimized />
          </button>
          <div className="document-card-copy">
            <span>{labels[record.type].short}</span><strong>{record.periodStart}</strong>
            <small>{record.originalFileName} · {sizeLabel(record.sizeBytes)}</small>
          </div>
          <button className="document-delete-action" type="button" disabled={pending !== null} aria-label={`删除 ${record.periodStart} ${labels[record.type].short}`} onClick={() => void remove(record)}>删除</button>
        </article>)}</div>}
    </section>
    </div>
    {activeDocument ? <div className="document-viewer-backdrop" onClick={closeViewer}>
      <section
        ref={viewerRef}
        className="document-viewer"
        role="dialog"
        aria-modal="true"
        aria-label={`${activeDocument.periodStart} ${labels[activeDocument.type].short}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="document-viewer-header"><div><strong>{activeDocument.periodStart}</strong><span>{labels[activeDocument.type].short}</span></div><button ref={closeButtonRef} type="button" onClick={closeViewer} aria-label="关闭图片">关闭</button></div>
        <Image src={activeDocument.imageUrl} alt={`${activeDocument.periodStart} ${labels[activeDocument.type].short}大图`} width={1200} height={1600} unoptimized />
        <a href={activeDocument.imageUrl} target="_blank" rel="noreferrer">新窗口查看原图</a>
      </section>
    </div> : null}
  </div>;
}
