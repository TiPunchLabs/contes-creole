// @vitest-environment happy-dom
import type { Bubble, Story } from "@app/contract";
import { describe, expect, it, vi } from "vitest";
import { STAGING } from "../staging";

const stage = vi.hoisted(() => ({ dispose: vi.fn(), start: vi.fn() }));

vi.mock("@shared/three/stage", async () => {
  const THREE = await import("three");
  return {
    createStage: () => ({
      ...stage,
      scene: new THREE.Scene(),
      camera: new THREE.PerspectiveCamera(),
    }),
  };
});

const story: Story = {
  lang: "gcf",
  title: "T",
  pages: Object.keys(STAGING).map((id) => ({ id, label: id, title: id, blocks: [] })),
};
const bubble: Bubble = { show: vi.fn(), hide: vi.fn() };

describe("Ti Kannot world mount", () => {
  it("releases the stage and its listeners when the mount fails half-way", async () => {
    const { default: world } = await import("./index");
    const container = document.createElement("div");
    const removed = vi.spyOn(container, "removeEventListener");
    stage.start.mockImplementationOnce(() => {
      throw new Error("loop failed");
    });
    expect(() => world.mount(container, { story, page: 0, bubble })).toThrow("loop failed");
    expect(stage.dispose).toHaveBeenCalledTimes(1);
    expect(removed.mock.calls.map(([type]) => type).sort()).toEqual([
      "pointerdown",
      "pointermove",
      "pointerup",
    ]);
  });

  it("fails on a page without staging, releasing the stage before any scene is built", async () => {
    stage.dispose.mockClear();
    const { default: world } = await import("./index");
    const broken: Story = { ...story, pages: [{ id: "nope", label: "", title: "", blocks: [] }] };
    expect(() =>
      world.mount(document.createElement("div"), { story: broken, page: 0, bubble }),
    ).toThrow('no staging for page "nope"');
    expect(stage.dispose).not.toHaveBeenCalled();
  });
});
