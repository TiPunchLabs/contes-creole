/** Seeded generator of a tale, numbers in [0, 1); every painter below draws from it in a fixed order. */
export type Rand = () => number;

/** Short curved brush strokes scattered over the sheet (colour, opacity, width and length drawn). */
export function brushStrokes(
  g: CanvasRenderingContext2D,
  rnd: Rand,
  w: number,
  h: number,
  n: number,
  colors: string[],
  len: [number, number] = [6, 22],
  wid: [number, number] = [1, 3],
  alpha = 0.35,
  angle: number | null = null,
): void {
  const rr = (a: number, b: number): number => a + (b - a) * rnd();
  for (let i = 0; i < n; i++) {
    g.strokeStyle = colors[(rnd() * colors.length) | 0];
    g.globalAlpha = alpha * rr(0.5, 1);
    g.lineWidth = rr(wid[0], wid[1]);
    g.lineCap = "round";
    const x = rnd() * w;
    const y = rnd() * h;
    const a = angle === null ? rnd() * Math.PI : angle + rr(-0.35, 0.35);
    const l = rr(len[0], len[1]);
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(
      x + Math.cos(a) * l * 0.5 + rr(-2, 2),
      y + Math.sin(a) * l * 0.5 + rr(-2, 2),
      x + Math.cos(a) * l,
      y + Math.sin(a) * l,
    );
    g.stroke();
  }
  g.globalAlpha = 1;
}

/** Mila's saffron paper dress: vertical brushwork with a few brown creases. */
export function paintDress(g: CanvasRenderingContext2D, w: number, h: number, rnd: Rand): void {
  g.fillStyle = "#eaa12a";
  g.fillRect(0, 0, w, h);
  brushStrokes(
    g,
    rnd,
    w,
    h,
    700,
    ["#f7c04d", "#d98a1c", "#ffd877", "#c97716", "#f2ad37"],
    [18, 72],
    [2, 5.5],
    0.5,
    Math.PI / 2,
  );
  brushStrokes(g, rnd, w, h, 120, ["#8a4b0e", "#b5651a"], [14, 46], [0.8, 1.6], 0.4);
}

/** The red madras of her hair ties (no draw from the generator). */
export function paintMadras(g: CanvasRenderingContext2D, w: number, h: number): void {
  g.fillStyle = "#d8352a";
  g.fillRect(0, 0, w, h);
  const band = (c: string, x: number, wd: number, a: number): void => {
    g.globalAlpha = a;
    g.fillStyle = c;
    g.fillRect(x, 0, wd, h);
    g.fillRect(0, x, w, wd);
  };
  band("#f2c230", 6, 10, 0.75);
  band("#f2c230", 38, 10, 0.75);
  band("#2f8a4a", 22, 6, 0.7);
  band("#ffffff", 54, 2, 0.6);
  band("#1d3f8a", 28, 2, 0.5);
  g.globalAlpha = 1;
}

/** Her curls: small dark spirals on a near-black ground. */
export function paintHair(g: CanvasRenderingContext2D, w: number, h: number, rnd: Rand): void {
  const rr = (a: number, b: number): number => a + (b - a) * rnd();
  g.fillStyle = "#160e0b";
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 1400; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    // same draws as the prototype, drawn on a sheet twice as fine
    const r = rr(1.5, 4.5) * 2;
    g.strokeStyle = ["#3b2519", "#2a1912", "#4d3020", "#0b0605"][(rnd() * 4) | 0];
    g.globalAlpha = rr(0.4, 0.9);
    g.lineWidth = rr(0.8, 1.8) * 1.5;
    g.beginPath();
    for (let a = 0; a < rr(4, 9); a += 0.5) {
      g.lineTo(x + Math.cos(a) * r * (a / 8 + 0.3), y + Math.sin(a) * r * (a / 8 + 0.3));
    }
    g.stroke();
  }
  g.globalAlpha = 1;
}
