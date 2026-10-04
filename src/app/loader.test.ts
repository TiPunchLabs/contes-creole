// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dismissLoader } from "./loader";

const TIMING = { minMs: 100, maxMs: 1000, fadeMs: 50 };

describe("dismissLoader", () => {
  let el: HTMLElement;
  beforeEach(() => {
    vi.useFakeTimers();
    el = document.createElement("div");
    document.body.append(el);
  });
  afterEach(() => {
    vi.useRealTimers();
    el.remove();
  });

  it("waits for readiness, then fades and removes the loader", async () => {
    let resolve!: () => void;
    const done = dismissLoader(el, new Promise<void>((r) => (resolve = r)), TIMING);
    await vi.advanceTimersByTimeAsync(500);
    expect(el.classList.contains("is-done")).toBe(false);
    resolve();
    await vi.advanceTimersByTimeAsync(0);
    expect(el.classList.contains("is-done")).toBe(true);
    await vi.advanceTimersByTimeAsync(50);
    await done;
    expect(el.isConnected).toBe(false);
  });

  it("stays at least minMs when ready immediately", async () => {
    void dismissLoader(el, Promise.resolve(), TIMING);
    await vi.advanceTimersByTimeAsync(99);
    expect(el.classList.contains("is-done")).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(el.classList.contains("is-done")).toBe(true);
  });

  it("gives up waiting after maxMs or on failure", async () => {
    void dismissLoader(el, new Promise(() => {}), TIMING);
    await vi.advanceTimersByTimeAsync(1000);
    expect(el.classList.contains("is-done")).toBe(true);

    const other = document.createElement("div");
    void dismissLoader(other, Promise.reject(new Error("boom")), TIMING);
    await vi.advanceTimersByTimeAsync(100);
    expect(other.classList.contains("is-done")).toBe(true);
  });
});
