# Roof design process — finding roof lines and laying out panels

How EasyLink works out a roof's faces and lines and fits panels to them.
This is the process that produced the verified layouts for 95 and 85 Bombay
St, Lidcombe (Oct 2026). Code lives in `src/lib/designer/`. **Keep the
lessons log at the bottom up to date**: every time a roof comes out wrong,
write down what happened, why, and what changed in the code.

## Rules (always)

| Rule | Value | Code |
|---|---|---|
| Setback from every roof line and obstruction | 100 mm | `DESIGN_RULES.edgeSetbackM` |
| One orientation for the whole design (portrait or landscape, never mixed) | — | `PanelOrientation` |
| Panels stay inside one face; never across a hip, valley or ridge | — | `generatePanelsForFaces` |
| Rows parallel to the main walls (alignment rule) | snap within 30° | `alignmentSnapDeg` |
| Roof lines straight: along the walls, square to them, or at 45° | snap within 20° | `regularizeRoofOutlines` |
| Line check against the image | ±100 mm | `roofLineToleranceM` |
| Panel : inverter limit — hybrid inverter or battery / standard | 200% / 133% | `dcAcLimitPercent` |
| Export limit (Ausgrid, Endeavour) | 10 kW per phase | `exportLimitKwPerPhase` |

## Process

1. **Zoom in.** Use a Google satellite image of the roof at zoom 21 (about
   2.5–3 cm per pixel). On the site: `/api/solar/roof-snapshot`; for a
   manual design: a screenshot like the ones in the lessons below.
2. **Outline (eaves).** Find the roof by its colour, grown from the pin
   (`roofSnapshot.ts`), straighten it into one line per wall
   (`roofLines.ts`), then fit every eave onto the roof edge
   (`fitEavesToMask`).
3. **Main walls.** The wall direction comes from the longest straight eaves,
   and from straight-edged neighbours (a carport, a patio) where the roof
   edge is faint. Hips run at 45° to the walls in plan.
4. **Faces — read each face from the image first.** Look at the zoomed
   image and mark every face as its own tiled surface: each colour/shade
   region bounded by the visible eaves, hips, ridges and valleys, including
   narrow strips and small triangles. Every corner sits where two visible
   lines meet. Then confirm the corners against the line equations (walls,
   45° hips) and Google's segments. Never let the height model or line
   detection decide the faces (lesson 77 Harry Ave #8). Supporting data:
   - Google building insights gives each face's pitch, facing direction and
     area. It tells you which faces exist and how big they are.
   - The height model (DSM, 0.5 m) shows where each face sits. It is coarse
     and from 2018, so it is not used for the exact lines.
   - The image shows the lines: hips and ridges as bright or dark capping
     lines, and sunny versus shaded faces. In Sydney, faces turned north
     and west are lighter.
   On the site, faces from the height model are filled out to the outline
   on the 3 cm grid (`fillFacesOnRoofs`), with each face's rows following its
   own eave.
   **4b. Confirm with Google (never decide with it).** Run
   `confirm-google.py roofs/x.json`:
   - Each Google segment centre must fall inside one image face, with its
     facing within 15°.
   - The total sloped area must be within 10% of Google's.
   - A face with no segment is fine when it is a narrow strip Google has
     merged into a neighbour.
   - A segment outside every face, or a facing or area mismatch, means
     look at the image again. Lines are never moved to match Google.
   77 Harry Ave: 6 of 7 faces confirmed, and the total was −0.8%. The east
   face was flagged (23°): its east edge is seen at an angle and runs at
   about 100° in the image, within 5° of Google. Rows stay square to the
   walls (alignment rule).
5. **Check every line against the image.** For each eave, hip, valley and
   ridge, look for the strongest brightness edge within ±40 px across it
   (`checkInteriorLine`, or the `fit.py` check used manually).
   - Lines within tolerance are confirmed.
   - Lines that are off are moved onto the edge, and the corners are
     rebuilt where the moved lines meet.
   - Lines with no clear edge, or with two conflicting edges, are drawn
     dashed orange: check on site.
   - A correction is undone if it would fold a face or make faces overlap
     (`facesValid`).
6. **Obstructions.** Trace each obstruction's real shape (vents,
   skylights, solar hot water, a lower roof breaking into a face). Pass it
   to the packer as `obstructions`. The packer keeps 100 mm clear and packs
   around it. Never delete panels afterwards (see lesson 4).
7. **Pack.** For each face, pack rows along its eave with its own pitch
   (the panel's depth up the slope is shortened by cos(pitch) in plan). Do
   this for portrait and for landscape, and offer both totals.
8. **Scale (screenshots only).** Fit the image's face centres to Google's
   face centres (lat/lng) to get metres per pixel. This came out at
   0.0242–0.0252 m/px for the Bombay St screenshots.

## Lessons log

Newest first. Add an entry whenever a design comes out wrong.

### 2026-10-28 — 57 Harry Ave, Lidcombe (L-shaped hip roof)
First roof done with the saved skill (`easylink-roof-design`).
1. **Faces read from the image.** There are six:
   - a WNW face;
   - a long NNE face across the whole north side;
   - a central ESE face between the wings;
   - the south wing's SSW face (with a vent);
   - the east wing's SSW face;
   - a small ESE hip end.
   The hip between the NNE and central ESE faces and the valley at the
   inner corner were both clear lines. The overlay sat on the image first
   time.
2. **Four of Google's nine segments are not this tiled roof.** One is on
   the neighbour's roof (50°), two are grey metal lower roofs (17°) and one
   is a flat roof. *Added:* `google_excluded` in the roof json, which lists
   each one with its reason and leaves it out of the total. With those out,
   the faces were within −4.5% of Google.
3. **The east wing's south eave runs at about 17° in the image**, not the
   wall's 28° (an oblique photo again). Google's facing is 190° against the
   snapped 208°, so it was flagged. Rows stay square to the walls.
4. **`pack-faces.ts` failed when the roof json had no outline.** The outline
   is now optional.

Result:
- 26 landscape (11.4 kW): WNW 5, NNE 8, ESE centre 8, SSW south wing 2, SSW
  east wing 2, ESE east end 1.
- 25 portrait (11.0 kW).

### 2026-10-28 — 61 Harry Ave, Lidcombe (hip roof with stepped east end)
First roof done end to end with the image-first rule.
1. **Faces from the image.** The roof is a main hip (WNW end, NNE, SSW)
   with an east hip end split by light strips, the same builder pattern as
   77 Harry Ave. The east end has:
   - an upper ESE face and a steeper ESE face;
   - a lit NNE strip along the north-east eave;
   - a light strip across the middle;
   - a lower ESE triangle.
   The main SE hip is offset by the middle strip: hip, then the strip's
   edge along the walls, then hip again.
2. **Using the height model to read the image.** It showed which face is
   where, as a colour-by-facing overlay, before the lines were read. It
   never set a line.
3. **Oblique photo: Google sits about 0.7 m off the image.** The ridge ends
   in the height model were 18 px east and 15 px south of the image. Google's
   segment centres need the same shift (`google_offset_px` in
   `confirm-google.py`), or a correct face reads as "not confirmed".
4. **The cream strip on the west edge is not roof.** Google reports a 35°
   WNW segment (9.7 m²) there. It is either the west wall seen at an angle
   or a lower roof. The face edge follows the tiles. The check measures the
   colour along each row (pink tiles against cream), which moved one
   corner 27 px from my first eyeball reading. Check it on site.
5. **The low grey roof to the north is a separate patio roof** (Google
   11.6°, 15 m²). It is not included.

Result:
- 25 landscape (11.0 kW): WNW 3, NNE 8, SSW 11, ESE upper 2, ESE lower 1.
- 22 portrait (9.7 kW).
Google confirmed 5 faces, with facing within 4–12°. The image faces total
123 m² against 134 m² from Google's tiled-roof segments (−9%; the height
model's blurred edges).
Design data: `scripts/roof-design/roofs/61-harry-ave.json`.

### 2026-10-28 — 77 Harry Ave, Lidcombe (multi-wing terracotta hip roof)
1. **Imagery is now fetched directly.** `maps.googleapis.com` and
   `solar.googleapis.com` are allowed for the workspace. The image is a
   zoom-21 Static Maps crop around Google's building box (3.1 cm/px). Use
   `format=png32`: plain `png` comes back palette-reduced.
2. **The colour finder traced the courtyard, the lawn edge and the flat
   roof.** The paving is the colour of the tiles. Also, Google's roof mask
   joins neighbouring buildings into one region. *Fixed in `roofSnapshot.ts`:*
   - the hint uses only the part of Google's mask within 3 m of the pin
     (this building);
   - a new height filter counts a pixel as roof only if it is at least
     2.2 m above yard level (the 25th percentile of the height model, not
     the lowest point: the street sits lower, and the courtyard here is a
     deck 1.3 m above the lawn).
   The page now passes the height model to the finder.
3. **Read the roof as overlapping hip rectangles.** Most internal lines run
   at 45° to the walls; they are hips and valleys, not walls. Here: a north
   wing (ridge along the walls, NNE and SSW faces) plus a main body (ridge
   at 90°, WNW and ESE faces, SSW hip end), joined by valleys. Corners are
   computed as intersections of the detected straight lines
   (`complex/lines77.py`). Consistency check: the NE corner from two
   different line pairs agreed within 0.3 px, and the main SE corner landed
   exactly on the east eave line.
4. **The east side is stepped and seen at an angle.** This image is a
   little off-vertical, so tall walls show as a dark band, and the roof's
   east edge runs at an angle the wall directions can't represent. Fitting
   wall-direction lines put a step outside the roof. Fix: use the eave
   lines on the north, west and south sides, and the traced roof edge on
   the east (`complex/hybrid.py`).
5. **Smoothing destroyed small faces.** Dropping trace steps under 0.8 m
   merged the east steps and collapsed the north wing's west face from
   14 m² to 3 m². Fix: faces whose lines are known are built straight from
   the line intersections (`complex/nwing.py`), and the outline keeps steps
   down to 0.35 m.
6. **Rows from the face's slope direction.** The "outline edge the face
   sits on" picked a hip on small faces, and the fallback formula was out
   by 90°. Rows now run at −bearing (compass to degrees from east,
   counter-clockwise), which is exact because bearings are snapped to the
   walls (`complex/pack77.ts`).
7. **Equal-pitch hip roofs with square walls follow exactly from the
   outline.** Each point belongs to its nearest eave in L∞ distance along
   the walls (`complex/skel.py`). This is only correct with a correct
   outline: every notch or noise step creates a false face.

8. **The first faces were wrong; the owner redrew them by hand.** The
   faces came from the height model, line detection and the L∞ skeleton.
   They merged the light strips into the faces next to them, so panels
   crossed visible lines. The owner marked 10 faces on the screenshot:
   - north wing: a WNW hip triangle, an NNE trapezoid and a dark SSW band;
   - east side: an ESE face under the wing, then a light strip;
   - main body: a WNW face and an ESE face;
   - south: an SSW face with a vent, a light NNE strip and a steep ESE
     triangle.
   The fix was to read each face from the image, place each corner where
   the visible lines meet, then check against the line equations. Corners
   M and N sat on the known hips within 2 px; L, R and F sat on the south
   and west eaves.
   Rule: **the image decides the faces; data only confirms them.** Light
   strips between faces are separate faces. Lines read from the zoomed
   image beat an affine transfer from another screenshot, which was up to
   20 px off on the SE wing.

Result (redrawn faces): 29 landscape (12.8 kW) or 26 portrait (11.4 kW).
Every panel is inside its own face. Panels per face, landscape:
- north wing: WNW 3, NNE 6;
- east face: 2;
- main body: WNW 8, ESE 6;
- south: SSW 3 (packed around the vent);
- SE triangle: 1.
The two light strips and the SSW band take no panels. The east edge is
traced and seen at an angle, so check it on site. Design data:
`scripts/roof-design/roofs/77-harry-ave.json` and `77-harry-ave-layout.png`.

### 2026-10-28 — 85 Bombay St, Lidcombe (dark grey hip roof)
1. **The colour finder found no roof.** The roof is dark grey with low
   contrast against the shadows and the dark ground around it. Faces had
   to come from Google's segments (NNE 30°, SSW 30°, WNW 32°, ESE 35°) plus
   the image. *Open:* the zoom-in finder still misses dark or grey roofs.
   Add a fallback that seeds from Google's roof mask when the pin's colour
   region is too small.
2. **The bright line through the pin is two hips, not a ridge.** It runs at
   45° to the walls (wall direction taken from the carport next door). On
   a near-square hip roof, the SW and NE hips plus a very short ridge look
   like one straight line.
3. **A gutter 0.6 m outside the east eave belongs to a lower feature.**
   Moving the eave onto it threw both main hips out of line (NE hip off by
   34 px). Rule: when an eave move makes confirmed hips fail, the eave is
   wrong. Keep the hips and mark the eave "check on site".
4. **The packer placed only 1 panel on the east face, although 3–4 fit.**
   The face was packed as if it were clear, then every panel touching the
   obstruction was deleted. Rows packed for an empty face line up badly
   with the gap an obstruction leaves. Also, the obstruction was a box
   drawn square to the screen around a feature lying at an angle, so it
   blocked far more roof than the feature. *Fixed in `panelLayout.ts`:*
   obstructions are an input to the packer, and each row subtracts the
   blocked range (plus setback) while it is filled, so the row-offset
   search packs around them. The obstruction's traced shape is used. The
   east face went from 1 panel to 4 (portrait) and 4 to 5 (landscape).
   Test: `panelLayout.test.ts`, "obstructions are packed around".
5. **The line check took the strongest edge, not the nearest.** It told
   the south eave to move 1 m outward, but the strongest edge there was the
   white roof next door. *Fixed in `check-lines.py`:* the check takes the
   nearest clear edge (at least 4× background). With that, the S, N and W
   eaves were confirmed at 0 mm.
6. **Hips derived from the corners were 0.3–0.4 m off the image hips.** The
   ridge ends sit slightly north-west of a symmetric hip shape. Fix: keep
   the corners fixed (confirmed eaves) and move the ridge ends until the
   hips sit on the image edges (`check-lines.py --refine R1,R2`). The hips
   then came out at SW −76 mm, NW +25 mm and NE 0 mm. The SE hip has no
   visible edge, so it is marked check on site.

Result: 23 portrait (10.1 kW) or 24 landscape (10.6 kW). The design data is
in `scripts/roof-design/roofs/85-bombay-st.json`.

### 2026-10-27/28 — 95 Bombay St, Lidcombe (terracotta, complex hip)
7. **The yellow lines were not straight.** Traced outlines wobbled.
   *Fixed:* `regularizeRoofOutlines` snaps each line to the walls, 90° or
   45°, fits one line per wall, drops trace steps under 0.45 m, and shares
   corners between faces.
8. **Three parallel lines were a ridge strip.** A narrow strip between two
   ridges takes no panels. It is drawn and kept, but left empty.
9. **The S1 eave sat 0.6 m inside the roof.** *Fixed:* eaves are fitted to
   the roof edge in the image (`fitEavesToMask`). The eaves ended within
   about 110 mm of the roof edge, and the hips and ridges within ±150 mm of
   the image edges.
10. **"No usable height data" on the live site.** Google Solar layers are
   in UTM metres (EPSG:32756), not degrees. Also, geotiff.js reports the y
   pixel size with the wrong sign, which flipped the height model north to
   south. *Fixed in `geotiff.ts` and `utm.ts`.*
11. **The height-model faces left gaps (only 23 panels).** The DSM is
   0.5 m and from 2018. *Fixed:* faces are filled out to the outline on the
   3 cm grid, and each face's rows come from its eave. Still open: on this
   roof the DSM merges two faces (the ridge strip, and the valley under the
   pin), which only the image shows.
12. **Image-only face finding was tried and dropped.** Tile texture and
    shadows create false lines that cut faces wrongly. Image edges are used
    to *check and correct* lines, not to invent them.
13. **AI reading of the roof (Bedrock).** The strongest Claude model
    available on the AWS account (Sonnet 4.6) was not accurate enough:
    corners were metres out. Needs Claude Opus 5.5 enabled in Bedrock
    (Sydney), or an Anthropic API key, before it is built in.

## Manual tools (`scripts/roof-design/`)

- `roofs/<address>.json`: one roof's measured points (image px), faces,
  lines, obstructions, scale and notes, plus its screenshot.
- `check-lines.py roofs/x.json [--refine A,B]`: checks every line against
  the image (step 5); `--refine` moves free points such as the ridge ends.
- `confirm-google.py roofs/x.json`: confirms image-read faces against Google segments (step 4b).
- `pack-faces.ts roofs/x.json out.json`: packs image-read faces (any roof json with scale and centre).
- `layout.ts`: packs the faces with the live site's packer (all rules,
  obstructions), in portrait and landscape.
- `draw.py`: draws the result for the customer or installer.
- `complex/`: the multi-wing tools used on 77 Harry Ave (line detection
  and intersections, faces from the height model, partition, hybrid
  outline, L∞ hip-roof faces, line verification, packing).
