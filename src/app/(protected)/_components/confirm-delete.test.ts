// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

import { confirmRecordDeletion } from "./confirm-delete";

afterEach(() => vi.unstubAllGlobals());

describe("confirmRecordDeletion", () => {
  it.each([true, false])("returns the browser decision when it is %s", (decision) => {
    const confirm = vi.fn().mockReturnValue(decision);
    vi.stubGlobal("confirm", confirm);

    expect(confirmRecordDeletion("睡眠记录")).toBe(decision);
    expect(confirm).toHaveBeenCalledWith("确认删除这条睡眠记录？删除后可从历史记录恢复。");
  });
});
