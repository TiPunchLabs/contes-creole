// @vitest-environment happy-dom
import type { BookHandle, Bubble, Story } from "@app/contract";
import type * as THREE from "three";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { STAGING } from "../staging";

const stage = vi.hoisted(() => ({
  dispose: vi.fn(),
  start: vi.fn(),
  camera: null as THREE.PerspectiveCamera | null,
}));
const paint = vi.hoisted(() => ({ render: vi.fn(), update: vi.fn(), dispose: vi.fn() }));

vi.mock("@shared/three/stage", async () => {
  const THREE = await import("three");
  return {
    createStage: () => {
      stage.camera = new THREE.PerspectiveCamera(50, 1.6);
      return {
        ...stage,
        renderer: { getSize: (v: THREE.Vector2) => v.set(1440, 900) },
        scene: new THREE.Scene(),
      };
    },
  };
});
vi.mock("./paint", () => ({ paintQuality: () => "low", createPaint: () => paint }));

const story: Story = {
  lang: "gcf",
  title: "T",
  pages: Object.keys(STAGING).map((id) => ({ id, label: id, title: id, blocks: [] })),
};
const bubble: Bubble = { show: vi.fn(), hide: vi.fn() };

/** Mounts the world on `page`, under reduced motion or not; returns its handle and frame loop. */
async function mountAt(page: number, calm: boolean) {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) => ({ matches: calm && query.includes("reduce") }) as MediaQueryList,
  );
  const { default: world } = await import("./index");
  const handle = world.mount(document.createElement("div"), { story, page, bubble }) as BookHandle;
  const [frame] = stage.start.mock.calls.at(-1) as [(time: number, dt: number) => void];
  const camera = stage.camera as THREE.PerspectiveCamera;
  /** Runs the loop for `seconds` and returns the camera position. */
  const run = (seconds: number): THREE.Vector3 => {
    for (let t = 0; t < seconds; t += 1 / 60) frame(t, 1 / 60);
    return camera.position.clone();
  };
  return { handle, camera, run };
}

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

  it("glides the camera to the new page's shot, without a jump on the first frame", async () => {
    const { handle, run } = await mountAt(1, false);
    const start = run(0.5);
    const end = (await mountAt(2, false)).run(0.5);
    handle.setPage(2);
    expect(run(1 / 60).distanceTo(start)).toBeLessThan(0.01);
    expect(run(4).distanceTo(end)).toBeLessThan(0.01);
    handle.dispose();
  });

  it("cuts straight to the new shot under reduced motion", async () => {
    const { handle, run } = await mountAt(1, true);
    const end = (await mountAt(2, true)).run(0.1);
    handle.setPage(2);
    expect(run(1 / 60).distanceTo(end)).toBeLessThan(0.01);
    handle.dispose();
  });

  it("keeps the camera move going when the text is hidden and shown mid-move", async () => {
    const plain = await mountAt(5, false);
    plain.handle.setPage(6);
    const path = [plain.run(0.6), plain.run(1), plain.run(3)];
    const { handle, run } = await mountAt(5, false);
    handle.setPage(6);
    run(0.6);
    handle.setCardHidden?.(true);
    expect(run(1).distanceTo(path[1])).toBeLessThan(1e-6);
    handle.setCardHidden?.(false);
    expect(run(3).distanceTo(path[2])).toBeLessThan(1e-6);
    plain.handle.dispose();
    handle.dispose();
  });

  it("keeps the camera where it is when the text is hidden, and only slides the frame", async () => {
    const { handle, camera, run } = await mountAt(3, false);
    const before = run(0.5);
    const offset = camera.view?.offsetX;
    handle.setCardHidden?.(true);
    expect(run(2).distanceTo(before)).toBeLessThan(0.01);
    expect(camera.view?.offsetX).toBeCloseTo(0);
    expect(offset).toBeLessThan(0);
    handle.dispose();
  });
});
