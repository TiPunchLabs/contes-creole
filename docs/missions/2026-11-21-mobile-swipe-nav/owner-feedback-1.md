# Owner feedback 1 — mobile swipe navigation (2026-11-21, relayed by pilotage)

Verbatim (French, owner tested the PR #52 preview on a phone):

> projet contes créoles bug navigation mobile: lorsque fait glisser mon droit la gauche vers la droite il n'y a pas de mouvement la rotation devrait suivre le sens que j'indique en swippant l'écran, il faut aussi enlever la barre de scroll horizontal présent à lécran la rotion a un cycle fix on devrait pouvoir tourner autour de l'arbre librement autant de tour que l'on veut afin de selectionner notre livre et pouvoir le faire dans le sens qu'on veut

## What it asks (pilot reading)

1. **Bug, home on a phone:** swiping the finger from left to right produces no movement. The rotation must follow the direction of the swipe, both ways.
2. **Bug:** a horizontal scrollbar is visible on screen. Remove it (find what overflows horizontally; do not just hide overflow if that would break text scrolling or native zoom).
3. **Change of behaviour, home tree on phones:** the rotation is a fixed cycle with ends. The owner wants to turn around the tree **freely, as many turns as wanted, in either direction**, to pick a book. This **replaces the brief's "respect the start and end of the course" for the home tree** (owner decision 2026-11-21). It does not change the tales: in a tale, one scene per gesture and the tale's bounds still hold (last scene: no close, no restart).

## Framing assumptions (reversible, state them in report.md)

- A1: The rotation follows the finger during the drag (continuous, direction of the swipe), then settles on the nearest book stop on release so a book is easy to select; a quick flick turns to the next stop in that direction. If you find a clearly better feel, propose it in one line.
- A2: Endless rotation needs the camera path to loop. Keep the opening framing (CANOPY-FACE) and the cards' positions; explain how you make the path cyclic (e.g. wrapping the angle while keeping the opening height) and what changes in height/framing between turns. Do not change art direction.
- A3: Desktop (wheel, trackpad, keyboard, narrow window) and tablet stay exactly as on `c5c6f0c`, as in the brief; this change is phone-only unless the shared code makes it free and harmless elsewhere — then ask pilotage first, do not ship it on desktop.
- A4: The home hint and taps on covers keep the brief's rules (tap with slight movement opens the right book; a drag starting on a cover does not).

## Expected

Fix on the same branch, tests (Playwright real touch input: L→R and R→L both move; several full turns both ways; no horizontal scrollbar at 390x844 and in landscape; tales unchanged), update the Deploy Preview of PR #52, update `report.md` (Version = new product SHA, feedback section), then one line: report ready, Version = <sha>.
