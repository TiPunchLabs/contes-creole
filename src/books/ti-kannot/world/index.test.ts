// @vitest-environment happy-dom
import type { BookHandle, Bubble, Story } from "@app/contract";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { STAGING } from "../staging";

const stage = vi.hoisted(() => ({ dispose: vi.fn(), start: vi.fn() }));
const paint = vi.hoisted(() => ({ render: vi.fn(), update: vi.fn(), dispose: vi.fn() }));

vi.mock("@shared/three/stage", async () => {
  const THREE = await import("three");
  return {
    createStage: () => ({
      ...stage,
      renderer: {},
      scene: new THREE.Scene(),
      camera: new THREE.PerspectiveCamera(),
    }),
  };
});
vi.mock("./paint", () => ({ paintQuality: () => "low", createPaint: () => paint }));

const story: Story = {
  lang: "gcf",
  title: "T",
  pages: Object.keys(STAGING).map((id) => ({ id, label: id, title: id, blocks: [] })),
};
const bubble: Bubble = { show: vi.fn(), hide: vi.fn() };

describe("Ti Kannot world mount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("releases everything it built when the mount fails half-way", async () => {
    const { default: world } = await import("./index");
    const container = document.createElement("div");
    const removed = vi.spyOn(container, "removeEventListener");
    stage.start.mockImplementationOnce(() => {
      throw new Error("loop failed");
    });
    expect(() => world.mount(container, { story, page: 0, bubble })).toThrow("loop failed");
    expect(stage.dispose).toHaveBeenCalledTimes(1);
    expect(paint.dispose).toHaveBeenCalledTimes(1);
    expect(container.querySelector(".tk-sound")).toBeNull();
    expect(removed.mock.calls.map(([type]) => type).sort()).toEqual([
      "pointerdown",
      "pointermove",
      "pointerup",
    ]);
  });

  it("fails on a page without staging, before any stage is created", async () => {
    const { default: world } = await import("./index");
    const broken: Story = { ...story, pages: [{ id: "nope", label: "", title: "", blocks: [] }] };
    expect(() =>
      world.mount(document.createElement("div"), { story: broken, page: 0, bubble }),
    ).toThrow('no staging for page "nope"');
    expect(stage.dispose).not.toHaveBeenCalled();
  });

  it("hands rendering to the watercolour pass", async () => {
    const { default: world } = await import("./index");
    const handle = world.mount(document.createElement("div"), {
      story,
      page: 0,
      bubble,
    }) as BookHandle;
    const [, render] = stage.start.mock.calls[0] as [unknown, () => void];
    render();
    expect(paint.render).toHaveBeenCalledTimes(1);
    handle.dispose();
  });
});
