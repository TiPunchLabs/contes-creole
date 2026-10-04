export const LOADER_TIMING = { minMs: 1200, maxMs: 10000, fadeMs: 700 };

/**
 * Fades out and removes the boot loader once `ready` settles, never before `minMs` (so the brand
 * can be read) nor after `maxMs` (so a stuck asset never blocks the app).
 */
export async function dismissLoader(
  el: HTMLElement | null,
  ready: Promise<unknown>,
  timing = LOADER_TIMING,
): Promise<void> {
  if (!el) return;
  const delay = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
  await Promise.all([
    Promise.race([ready.catch(() => undefined), delay(timing.maxMs)]),
    delay(timing.minMs),
  ]);
  el.classList.add("is-done");
  await delay(timing.fadeMs);
  el.remove();
}
