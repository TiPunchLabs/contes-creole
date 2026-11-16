#!/bin/bash
# Before/after boards of the mission: baseline/ against a final folder (same scripts, viewports,
# instants). Usage: boards.sh [media-root] [final-dir]   (ImageMagick and ffmpeg)
set -euo pipefail
Q=${1:-$HOME/.local/share/contes-creole-qa/home-visual-polish}
B=$Q/baseline
F=${2:-$Q/final}
O=$F/boards
mkdir -p "$O"
L=(-font DejaVu-Sans -pointsize 26 -background white)

pair() { # name tile geometry file...
	local name=$1 tile=$2 geo=$3
	shift 3
	local args=()
	for f in "$@"; do
		args+=(-label "before $f" "$B/$f" -label "after $f" "$F/$f")
	done
	magick montage "${L[@]}" "${args[@]}" -tile "$tile" -geometry "$geo" -quality 90 "$O/$name.jpg"
}

pair before-after-desktop 2x3 1200x+6+6 view-desktop-rest-02s.png view-desktop-rest-12s.png view-desktop-rest-30s.png
pair before-after-desktop-grey 2x1 1200x+6+6 view-desktop-rest-02s.gray.png
pair before-after-desktop-thumb 2x1 320x+6+6 view-desktop-rest-02s.thumb.png
pair before-after-mobile 6x1 585x+6+6 view-mobile-rest-02s.png view-mobile-rest-12s.png view-mobile-rest-30s.png
pair before-after-mobile-grey 2x1 585x+6+6 view-mobile-rest-02s.gray.png
pair before-after-intermediate 4x2 x820+6+6 view-tablet-rest-02s.png view-laptop-rest-02s.png view-small-rest-02s.png view-tall-rest-02s.png
pair before-after-climb-desktop 2x4 1000x+6+6 climb-desktop-t0.10.png climb-desktop-t0.20.png climb-desktop-t0.54.png climb-desktop-t1.00.png
pair before-after-climb-mobile 8x1 400x+6+6 climb-mobile-t0.10.png climb-mobile-t0.20.png climb-mobile-t0.54.png climb-mobile-t1.00.png
pair before-after-reduced-motion 4x1 x700+6+6 view-desktop-reduced-motion-02s.png view-mobile-reduced-motion-02s.png

for who in lapen zanba; do
	for set in "$B" "$F"; do
		magick montage "$set"/turntable-$who-idle-{front,three-quarter,side,back}-lit.png \
			"$set"/turntable-$who-walk-side-lit.png \
			"$set"/turntable-$who-idle-{front,three-quarter,side,back}-silhouette.png \
			"$set"/turntable-$who-walk-side-silhouette.png \
			-tile 5x2 -geometry 520x520+3+3 "$O/sheet-$(basename "$set")-$who.png"
	done
	magick "${L[@]}" \( -label "before" "$O/sheet-$(basename "$B")-$who.png" \) \( -label "after" "$O/sheet-$(basename "$F")-$who.png" \) \
		-append -quality 92 "$O/before-after-turntable-$who.jpg"
done
# x2 close-ups at displayed size: the critters where the app shows them (DPR 2 device pixels).
magick montage "${L[@]}" \
	-label "before lapen x2" "$B/closeup-lapen-desktop2x-x2-02s.png" -label "after lapen x2" "$F/closeup-lapen-desktop2x-x2-02s.png" \
	-label "before zanba x2" "$B/closeup-zanba-desktop2x-x2-02s.png" -label "after zanba x2" "$F/closeup-zanba-desktop2x-x2-02s.png" \
	-label "before lapen phone" "$B/closeup-lapen-mobile-x3-emulated-02s.png" -label "after lapen phone" "$F/closeup-lapen-mobile-x3-emulated-02s.png" \
	-label "before zanba phone" "$B/closeup-zanba-mobile-x3-emulated-12s.png" -label "after zanba phone" "$F/closeup-zanba-mobile-x3-emulated-02s.png" \
	-tile 4x2 -geometry 520x520+6+6 -quality 92 "$O/before-after-closeups.jpg"
magick montage "${L[@]}" -label '%f' "$F"/sweep-{laptop,w800,w1280,w1920,w1100x1000,w900sq,tablet,small}.png \
	-tile 4x2 -geometry 900x760+6+6 -quality 90 "$O/final-layout-sweep.jpg"
if [ -f "$F/sweep-phone-landscape-l.png" ]; then
	# Short landscape screens and the two sides of the layout limit (review 1).
	magick montage "${L[@]}" -label '%f' "$F"/sweep-{phone-landscape,phone-landscape-l,phone-landscape-s,w1024x540,w1200x1000,w1201x1000,w1250x1000,w1280x1024}.png \
		-tile 4x2 -geometry 900x760+6+6 -quality 90 "$O/final-layout-sweep-review1.jpg"
	magick montage "${L[@]}" -label '%f' "$F"/view-phone-landscape-rest-{02,12,30}s.png "$F"/climb-phone-landscape-t{0.10,0.20,0.54,1.00}.png \
		"$F"/view-phone-landscape-l-rest-02s.png "$F"/climb-phone-landscape-l-t{0.10,0.20,0.54,1.00}.png \
		-tile 4x3 -geometry 844x430+6+6 -quality 90 "$O/final-phone-landscape.jpg"
fi
# Slow motion copies of the character videos (x0.25) for frame reading.
for v in video-follow-lapen video-follow-zanba video-characters-rest-desktop video-characters-rest-phone-landscape; do
	[ -f "$F/$v.mp4" ] || continue
	ffmpeg -y -loglevel error -i "$F/$v.mp4" -vf "setpts=4*PTS" -r 30 -c:v libx264 -pix_fmt yuv420p -crf 20 "$F/$v-x0.25.mp4"
done
echo "boards in $O"
