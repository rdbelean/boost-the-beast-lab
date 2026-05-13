import { describe, expect, it } from "vitest";
import { toggleMultiSelect } from "@/lib/analyse/multi-select-toggle";

const EXCLUSIVE = ["none"] as const;

describe("toggleMultiSelect", () => {
  it("adds a non-exclusive value to an empty selection", () => {
    expect(toggleMultiSelect([], "job", EXCLUSIVE)).toEqual(["job"]);
  });

  it("appends a non-exclusive value to existing non-exclusive values", () => {
    expect(toggleMultiSelect(["job"], "family", EXCLUSIVE)).toEqual(["job", "family"]);
  });

  it("removes a value when it is toggled off", () => {
    expect(toggleMultiSelect(["job", "family"], "job", EXCLUSIVE)).toEqual(["family"]);
  });

  it("clears all other values when selecting an exclusive option", () => {
    expect(toggleMultiSelect(["job", "family"], "none", EXCLUSIVE)).toEqual(["none"]);
  });

  it("removes the exclusive value when selecting a non-exclusive value", () => {
    expect(toggleMultiSelect(["none"], "job", EXCLUSIVE)).toEqual(["job"]);
  });

  it("removes the exclusive value but keeps existing non-exclusive values when adding another non-exclusive", () => {
    expect(toggleMultiSelect(["job", "none"], "family", EXCLUSIVE)).toEqual(["job", "family"]);
  });

  it("toggles the exclusive value off when it is the only one selected", () => {
    expect(toggleMultiSelect(["none"], "none", EXCLUSIVE)).toEqual([]);
  });

  it("does not mutate the input array", () => {
    const input = ["job"];
    toggleMultiSelect(input, "family", EXCLUSIVE);
    expect(input).toEqual(["job"]);
  });

  it("works with no exclusive values configured (plain multi-select)", () => {
    expect(toggleMultiSelect(["a"], "b")).toEqual(["a", "b"]);
    expect(toggleMultiSelect(["a", "b"], "a")).toEqual(["b"]);
  });
});
