import { describe, expect, it } from "vitest";
import { cleanResourceTitle, shortCodeLabel } from "@/lib/titleUtils";

describe("cleanResourceTitle", () => {
  it("formats writeup filenames", () => {
    expect(cleanResourceTitle("Sem 4 AIESL WriteUp 1 A*Star.pdf")).toBe(
      "Writeup 1: A*Star",
    );
  });

  it("formats assignment and dataset filenames", () => {
    expect(cleanResourceTitle("Sem 5 OSL Assignment 2A Orphan.py")).toBe(
      "Assignment 2A: Orphan",
    );
    expect(
      cleanResourceTitle("Sem 5 MLL Assignment 1 Dataset diabetes.csv"),
    ).toBe("Dataset 1: diabetes");
  });

  it("formats PPT unit titles", () => {
    expect(cleanResourceTitle("DE PPT Unit 4 Intro.pptx")).toBe(
      "Unit 4: Intro",
    );
  });
});

describe("shortCodeLabel", () => {
  it("shortens assignment and dataset labels", () => {
    expect(shortCodeLabel("Sem 5 OSL Assignment 2A Orphan.py")).toBe(
      "2A: Orphan",
    );
    expect(shortCodeLabel("Sem 5 MLL Assignment 1 Dataset diabetes.csv")).toBe(
      "Data 1: diabetes",
    );
  });
});
