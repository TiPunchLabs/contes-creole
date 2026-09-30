/** Vignette and film grain laid over every universe (v13 overlay). */
export function createBackdrop(root: HTMLElement): void {
  const vignette = document.createElement("div");
  vignette.className = "app-vignette";
  const grain = document.createElement("div");
  grain.className = "app-grain";
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const image = ctx.createImageData(256, 256);
    for (let i = 0; i < image.data.length; i += 4) {
      const v = 110 + Math.random() * 60;
      image.data[i] = image.data[i + 1] = image.data[i + 2] = v;
      image.data[i + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
    grain.style.backgroundImage = `url(${canvas.toDataURL()})`;
  }
  root.append(vignette, grain);
}
