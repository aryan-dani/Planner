import { describe, expect, it } from "vitest";
import { getDirectDownloadUrl } from "@/lib/driveFileCache";

describe("getDirectDownloadUrl", () => {
  it("encodes drive id with special characters", () => {
    const id = "abc/def+ghi=";
    const url = getDirectDownloadUrl(id);
    expect(url).toBe(
      `https://drive.usercontent.google.com/download?id=${encodeURIComponent(id)}&export=download&confirm=t`,
    );
    expect(url).toContain(encodeURIComponent(id));
    expect(url).not.toContain("abc/def");
  });
});
