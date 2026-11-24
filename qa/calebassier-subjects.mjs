// « Mila et le calebassier magique »: what the lens must keep on the screen, shared by
// qa/calebassier-framing.mjs (viewer, through time) and qa/calebassier.mjs mode `framing` (real
// app, against the text card). A subject is a disc: centre as fractions of the view, radius as a
// fraction of its height (the world's `Framed`).

const touch = (width, height) => ({
  viewport: { width, height },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
/** Screens the framing is checked on; every size is an emulated viewport, not a device. */
export const SCREENS = {
  phone: touch(390, 844),
  small: touch(360, 640),
  narrow: touch(320, 568),
  tall: touch(412, 915),
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  "phone-landscape": touch(844, 390),
  "small-landscape": touch(640, 360),
};

/** Pixels a subject must keep from an edge of the screen. */
export const EDGE = 4;

/**
 * Names of the subjects that must be whole on the screen for a sample `{ end, hold, subjects }` of a
 * page: while Mila holds the hero calabash, the fruit, her face and both hands at every instant; at
 * the reading frame (`end`) also every face shown, the lantern and its hand, and the gift once it
 * is in Man Ninon's hands. Page 11 ends on the whole tree: the fruit back on its branch is kept.
 */
export function required(page, sample) {
  const has = (name) => name in sample.subjects;
  const names = new Set();
  if (sample.hold >= 0.99) {
    for (const name of ["hero", "milaFace", "milaLeftHand", "milaRightHand"]) names.add(name);
  }
  if (sample.end) {
    for (const name of ["milaFace", "ninonFace", "lamp"]) if (has(name)) names.add(name);
    if (has("lamp")) names.add("ninonRightHand");
    if (has("gift") && sample.gift >= 0.99) names.add("gift");
    if (page === "p06" || page === "p11") names.add("hero");
  }
  return [...names].filter(has);
}

/** The subject's box in pixels on a `width` × `height` screen. */
export function box(subject, width, height) {
  const r = subject.r * height;
  const x = subject.x * width;
  const y = subject.y * height;
  return { l: x - r, t: y - r, r: x + r, b: y + r };
}

/** Why a subject is not whole on the screen (a short text), or null when it is. */
export function cropped(subject, width, height) {
  if (!subject) return "missing";
  if (!subject.front) return "behind the lens";
  const b = box(subject, width, height);
  const out = [];
  if (b.l < EDGE) out.push(`${Math.round(EDGE - b.l)} px past the left edge`);
  if (b.r > width - EDGE) out.push(`${Math.round(b.r - (width - EDGE))} px past the right edge`);
  if (b.t < EDGE) out.push(`${Math.round(EDGE - b.t)} px past the top edge`);
  if (b.b > height - EDGE) out.push(`${Math.round(b.b - (height - EDGE))} px past the bottom edge`);
  return out.length ? out.join(", ") : null;
}

/** Pixels of the subject's centre line that lie under `rect` ({ l, t, r, b }), 0 when it is clear of it. */
export function under(subject, rect, width, height) {
  const b = box(subject, width, height);
  const w = Math.min(b.r, rect.r) - Math.max(b.l, rect.l);
  const h = Math.min(b.b, rect.b) - Math.max(b.t, rect.t);
  return w > 0 && h > 0 ? Math.round(Math.min(w, h)) : 0;
}

/**
 * Share of a subject that must really be drawn (the world's `probe.visibility()`: rendered with and
 * without it) for it to count as readable. A projected disc says where a subject is, not that
 * anything of it is seen: a painted cut-out, a wall or another figure may stand before it.
 */
export const READABLE = [
  [/Face$/, 0.8],
  [/^lamp$/, 0.7],
  [/Hand$/, 0.5],
  [/^(hero|gift)$/, 0.5],
];
/** Seconds a face or the held fruit may stay hidden at a stretch (behind a gate post, in a turn). */
export const HIDDEN_MAX = 1.5;
/**
 * Moments of the action where what is told must be readable at every instant, whatever the lens
 * does: Mila calling from the gate (page 1), Man Ninon arriving with her lantern, the meeting and
 * the walk (page 10, review 2 F3), the tree's gift in Man Ninon's hands until she turns to Mila
 * (page 12). A prop is asked for where the page tells it, not everywhere: the figure who carries it
 * hides it when she turns away (the lantern on page 11, the gift after 7.4 s on page 12).
 */
export const WINDOWS = {
  p01: [{ from: 3.8, to: 6.4, names: ["milaFace", "ninonFace"] }],
  p10: [{ from: 5.2, to: 11.5, names: ["ninonFace", "lamp", "ninonRightHand", "milaFace"] }],
  p12: [{ from: 5.6, to: 7.4, names: ["gift", "ninonFace", "milaFace"] }],
};

/** The share a named subject needs to be readable. */
export function readableShare(name) {
  return READABLE.find(([pattern]) => pattern.test(name))?.[1] ?? 0.5;
}

/**
 * What is hidden over a page's samples `{ t, end, hold, gift, subjects, visibility }` (in time
 * order), as short texts: a face, or the fruit in Mila's hands, that once readable stays hidden for more than
 * `HIDDEN_MAX` or is hidden at the reading frame; a subject of a `WINDOWS` moment below its share
 * at any instant of it; the hero calabash hidden at the reading frame when it is required there.
 */
export function hidden(page, samples) {
  const faults = [];
  const pct = (v) => `${Math.round(v * 100)} %`;
  const names = new Set(samples.flatMap((s) => Object.keys(s.visibility)));
  for (const name of [...names].filter((n) => /Face$|^hero$/.test(n))) {
    const min = readableShare(name);
    let seen = false;
    let since = null;
    let lowest = 1;
    for (const s of samples) {
      // The fruit counts while Mila holds it; on its branch or the table it is part of the set.
      const v = name === "hero" && s.hold < 0.99 ? undefined : s.visibility[name];
      // Not on the screen at all (walking in or out): the edges are the other check's business.
      if (v === undefined) {
        since = null;
        continue;
      }
      if (v >= min) {
        seen = true;
        since = null;
        lowest = 1;
        continue;
      }
      if (!seen) continue;
      since ??= s.t;
      lowest = Math.min(lowest, v);
      if (s.t - since > HIDDEN_MAX || s.end) {
        faults.push(
          `${name} hidden from ${since.toFixed(2)} s${s.end ? " to the reading frame" : ` for more than ${HIDDEN_MAX} s`} (down to ${pct(lowest)} drawn)`,
        );
        break;
      }
    }
  }
  for (const w of WINDOWS[page] ?? []) {
    for (const name of w.names) {
      const min = readableShare(name);
      const bad = samples
        .filter((s) => s.t >= w.from && s.t <= w.to)
        .map((s) => [s.t, s.visibility[name] ?? 0])
        .filter(([, v]) => v < min);
      if (bad.length) {
        const [t, v] = bad.reduce((a, b) => (b[1] < a[1] ? b : a));
        faults.push(
          `${name} not readable between ${w.from} and ${w.to} s: ${pct(v)} drawn at ${t.toFixed(2)} s (${bad.length} instants under ${pct(min)})`,
        );
      }
    }
  }
  const last = samples.at(-1);
  if (last?.end && required(page, last).includes("hero")) {
    const v = last.visibility.hero ?? 0;
    if (v < readableShare("hero")) faults.push(`hero ${pct(v)} drawn at the reading frame`);
  }
  return faults;
}
