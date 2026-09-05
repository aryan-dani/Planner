import { describe, expect, it, afterEach } from "vitest";
import { NextResponse } from "next/server";
import { getAdminEmails, isAuthFailure } from "@/lib/apiAuth";

describe("getAdminEmails", () => {
  const original = process.env.ADMIN_EMAILS;

  afterEach(() => {
    process.env.ADMIN_EMAILS = original;
  });

  it("parses comma-separated emails trimmed and lowercased", () => {
    process.env.ADMIN_EMAILS = " Admin@Example.com ,  ";
    expect(getAdminEmails()).toEqual(["admin@example.com"]);
  });

  it("returns empty array when unset", () => {
    delete process.env.ADMIN_EMAILS;
    expect(getAdminEmails()).toEqual([]);
  });
});

describe("isAuthFailure", () => {
  it("returns true for NextResponse", () => {
    const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    expect(isAuthFailure(res)).toBe(true);
  });

  it("returns false for AuthedUser", () => {
    expect(isAuthFailure({ uid: "u1", email: "a@b.com" })).toBe(false);
  });
});
