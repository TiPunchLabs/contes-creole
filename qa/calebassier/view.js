// QA-only viewer for « Mila et le calebassier magique » (served by `vite` dev, never built): mounts
// the book's world alone, without the app shell, so captures share exact pages and instants.
//   ?page=3&t=4.5   page (1-based) frozen at an instant of its action (default: its last instant)
//   ?graybox=1      grey proxies instead of the painted materials (layout and animatic)
//   ?slate=1        shows the page id and instant (animatic)
//   ?card=0         frames the scene as in "scène seule" (no text shift)
// window.__cal: seek(page0, t), resume(), setGraybox(on), info(), setPage(page0), ready (promise).
import { parseStory } from "/src/app/story/parse.ts";
import source from "/src/books/mila-calebassier/story/fr.md?raw";
import world from "/src/books/mila-calebassier/world/index.ts";

const params = new URLSearchParams(location.search);
const story = parseStory(source, "story/fr.md");
const stage = document.getElementById("stage");
const slate = document.getElementById("slate");
const page = Math.max(1, Number(params.get("page") ?? 1)) - 1;

const ready = world
  .mount(stage, { story, page, bubble: { show() {}, hide() {} } })
  .then((handle) => {
    const { probe } = handle;
    if (params.get("card") === "0") handle.setCardHidden(true);
    if (params.get("graybox") === "1") probe.setGraybox(true);
    if (params.has("t") || !params.has("live")) {
      probe.seek(page, params.has("t") ? Number(params.get("t")) : 1e3);
    }
    const label = (index, seconds) => {
      slate.style.display = params.get("slate") === "1" ? "block" : "none";
      slate.textContent = `${story.pages[index].id}  t=${seconds.toFixed(1)}s  ${story.pages[index].title}`;
    };
    label(page, probe.info().clock);
    return {
      ...probe,
      seek(index, seconds) {
        probe.seek(index, seconds);
        label(index, Math.min(seconds, 99));
      },
      setPage: (index) => handle.setPage(index),
      setCardHidden: (hidden) => handle.setCardHidden(hidden),
      dispose: () => handle.dispose(),
      pages: story.pages.map((p) => p.id),
    };
  });
ready.catch((err) => {
  document.body.dataset.error = String(err);
  console.error(err);
});
window.__cal = { ready };
