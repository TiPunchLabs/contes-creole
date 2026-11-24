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
