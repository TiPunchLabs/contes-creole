/**
 * Reveals the "copy the subject" button when the clipboard is usable, so a teacher on a phone can
 * paste the subject into the contact form. Without it the subject stays readable on the page.
 */
export function enhanceCopy(root: ParentNode, clipboard: Pick<Clipboard, "writeText"> | undefined) {
  const button = root.querySelector<HTMLButtonElement>(".cc-copy");
  const subject = root.querySelector(".cc-subject-text")?.textContent?.trim();
  const status = root.querySelector(".cc-copy-status");
  if (!button || !subject || !status || !clipboard) return;
  button.hidden = false;
  button.addEventListener("click", () => {
    clipboard.writeText(subject).then(
      () => (status.textContent = "Objet copié"),
      () => (status.textContent = "Copie impossible : recopiez l'objet ci-dessus"),
    );
  });
}
