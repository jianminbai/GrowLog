// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement, type ImgHTMLAttributes } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CSRF_COOKIE_NAME } from "@/modules/auth/auth-constants";

vi.mock("next/image", () => ({ default: ({ unoptimized, ...props }: ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean }) => {
  void unoptimized;
  return createElement("img", props);
} }));

import { DocumentManager } from "./document-manager";

const storedDocument = {
  id: "document-1",
  childId: "child-1",
  type: "DAILY_CARE_SHEET" as const,
  periodStart: "2026-10-20",
  originalFileName: "保教单.png",
  mimeType: "image/png",
  sizeBytes: 1024,
  createdAt: "2026-10-20T01:00:00.000Z",
  updatedAt: "2026-10-20T02:00:00.000Z",
  imageUrl: "/api/kindergarten-documents/document-1/image?v=2026-10-20T02%3A00%3A00.000Z"
};

describe("kindergarten document manager", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let revokeObjectUrl: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    document.cookie = `${CSRF_COOKIE_NAME}=csrf-token`;
    fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { documents: [storedDocument] } }), {
      status: 200,
      headers: { "content-type": "application/json" }
    }));
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:preview");
    revokeObjectUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("loads the selected child's history and renders versioned authenticated images", async () => {
    render(<DocumentManager childOptions={[{ id: "child-1", name: "小满" }]} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/kindergarten-documents?childId=child-1",
      { cache: "no-store" }
    ));
    expect(await screen.findByText(/保教单\.png/)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "2026-10-20 保教单" })).toHaveAttribute("src", storedDocument.imageUrl);
  });

  it("previews a valid image and uploads multipart without overriding its content type", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ data: { documents: [] } })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { document: storedDocument } }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { documents: [storedDocument] } })));
    const { unmount } = render(<DocumentManager childOptions={[{ id: "child-1", name: "小满" }]} />);
    const image = new File([Uint8Array.from([1, 2, 3])], "care.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("保教单日期"), { target: { value: "2026-10-20" } });
    fireEvent.change(screen.getByLabelText("选择保教单图片"), { target: { files: [image] } });
    expect(screen.getByRole("img", { name: "保教单上传预览" })).toHaveAttribute("src", "blob:preview");
    fireEvent.submit(screen.getByRole("button", { name: "上传保教单" }).closest("form")!);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    const [, request] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/kindergarten-documents");
    expect(request.method).toBe("POST");
    expect(request.headers).toEqual({ "x-csrf-token": "csrf-token" });
    expect(request.body).toBeInstanceOf(FormData);
    expect((request.body as FormData).get("type")).toBe("DAILY_CARE_SHEET");
    expect((request.body as FormData).get("image")).toBe(image);
    await screen.findByText("上传成功");
    unmount();
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:preview");
  });

  it("warns before replacing an existing period", async () => {
    render(<DocumentManager childOptions={[{ id: "child-1", name: "小满" }]} />);
    await screen.findByText(/保教单\.png/);
    fireEvent.change(screen.getByLabelText("保教单日期"), { target: { value: "2026-10-20" } });
    expect(screen.getByText("该日期已有保教单，上传后将替换原图。")).toBeInTheDocument();
  });

  it("ignores stale history responses and clears draft uploads when the child changes", async () => {
    let resolveFirst!: (response: Response) => void;
    const firstResponse = new Promise<Response>((resolve) => { resolveFirst = resolve; });
    const childTwoDocument = {
      ...storedDocument,
      id: "document-2",
      childId: "child-2",
      type: "WEEKLY_MENU" as const,
      originalFileName: "menu.png",
      imageUrl: "/api/kindergarten-documents/document-2/image?v=2"
    };
    fetchMock.mockImplementation((input) => {
      const url = String(input);
      if (url.includes("childId=child-1")) return firstResponse;
      return Promise.resolve(new Response(JSON.stringify({ data: { documents: [childTwoDocument] } })));
    });
    render(<DocumentManager childOptions={[
      { id: "child-1", name: "小满" },
      { id: "child-2", name: "小禾" }
    ]} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/kindergarten-documents?childId=child-1",
      { cache: "no-store" }
    ));
    fireEvent.change(screen.getByLabelText("保教单日期"), { target: { value: "2026-10-20" } });
    fireEvent.change(screen.getByLabelText("选择保教单图片"), {
      target: { files: [new File([Uint8Array.from([1])], "draft.png", { type: "image/png" })] }
    });
    fireEvent.change(screen.getByLabelText("选择孩子"), { target: { value: "child-2" } });

    expect(screen.getByLabelText("保教单日期")).toHaveValue("");
    expect(screen.queryByRole("img", { name: "保教单上传预览" })).not.toBeInTheDocument();
    expect(await screen.findByText(/menu\.png/)).toBeInTheDocument();
    resolveFirst(new Response(JSON.stringify({ data: { documents: [storedDocument] } })));
    await waitFor(() => expect(screen.queryByText(/保教单\.png/)).not.toBeInTheDocument());
    expect(screen.getByText(/menu\.png/)).toBeInTheDocument();
  });

  it("opens a focus-contained viewer, closes from the focused control on Escape, and returns focus", async () => {
    render(<DocumentManager childOptions={[{ id: "child-1", name: "小满" }]} />);
    const opener = await screen.findByRole("button", { name: "查看 2026-10-20 保教单" });
    fireEvent.click(opener);
    const dialog = screen.getByRole("dialog", { name: "2026-10-20 保教单" });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "新窗口查看原图" })).toHaveAttribute("href", storedDocument.imageUrl);
    const close = screen.getByRole("button", { name: "关闭图片" });
    await waitFor(() => expect(close).toHaveFocus());
    expect(screen.getByTestId("document-manager-content")).toHaveAttribute("inert");
    fireEvent.keyDown(close, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(opener);
  });

  it("confirms deletion, sends CSRF, and refreshes history", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ data: { documents: [storedDocument] } })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { deletedId: "document-1" } })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { documents: [] } })));
    render(<DocumentManager childOptions={[{ id: "child-1", name: "小满" }]} />);
    fireEvent.click(await screen.findByRole("button", { name: "删除 2026-10-20 保教单" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/kindergarten-documents/document-1",
      { method: "DELETE", headers: { "x-csrf-token": "csrf-token" } }
    ));
    await waitFor(() => expect(screen.queryByText("保教单.png")).not.toBeInTheDocument());
  });
});
