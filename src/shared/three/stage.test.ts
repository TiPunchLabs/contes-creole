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
    pixelRatio = 0;
    /** Records the requested pixel ratio. */
    setPixelRatio(ratio: number): void {
      this.pixelRatio = ratio;
    }
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

describe("createStage options", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("keeps the historical defaults", async () => {
    vi.stubGlobal("devicePixelRatio", 3);
    const { createStage } = await import("./stage");
    const stage = createStage(document.createElement("div"));
    expect(stage.renderer.toneMappingExposure).toBe(1.15);
    expect((stage.renderer as unknown as { pixelRatio: number }).pixelRatio).toBe(1.5);
  });

  it("applies exposure and pixel-ratio cap", async () => {
    vi.stubGlobal("devicePixelRatio", 3);
    const { createStage } = await import("./stage");
    const stage = createStage(document.createElement("div"), { exposure: 1.05, maxPixelRatio: 1 });
    expect(stage.renderer.toneMappingExposure).toBe(1.05);
    expect((stage.renderer as unknown as { pixelRatio: number }).pixelRatio).toBe(1);
  });
});
