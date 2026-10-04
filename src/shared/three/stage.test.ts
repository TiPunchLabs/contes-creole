// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";

const rendered = vi.hoisted(() => vi.fn());

vi.mock("three", async (importOriginal) => {
  const THREE = await importOriginal<typeof import("three")>();
  /** WebGL-free stand-in recording draw calls. */
  class FakeRenderer {
    outputColorSpace = "";
    toneMapping = 0;
    toneMappingExposure = 1;
    render = rendered;
    /** No-op. */
    setPixelRatio(): void {}
    /** No-op. */
    setSize(): void {}
    /** No-op. */
    dispose(): void {}
    /** No-op. */
    forceContextLoss(): void {}
  }
  return { ...THREE, WebGLRenderer: FakeRenderer };
});

describe("createStage render hook", () => {
  afterEach(() => vi.unstubAllGlobals());

  /** Runs one animation frame of a freshly started stage. */
  async function oneFrame(render?: () => void): Promise<void> {
    let tick: FrameRequestCallback = () => {};
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => ((tick = cb), 1));
    vi.stubGlobal("cancelAnimationFrame", () => {});
    const { createStage } = await import("./stage");
    const stage = createStage(document.createElement("div"));
    stage.start(() => {}, render);
    tick(16);
  }

  it("renders the scene itself by default", async () => {
    rendered.mockClear();
    await oneFrame();
    expect(rendered).toHaveBeenCalledTimes(1);
  });

  it("lets a world take over rendering", async () => {
    rendered.mockClear();
    const custom = vi.fn();
    await oneFrame(custom);
    expect(custom).toHaveBeenCalledTimes(1);
    expect(rendered).not.toHaveBeenCalled();
  });
});
