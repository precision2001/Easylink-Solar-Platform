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
4. **Faces.** Read the faces from Google's data together with the image:
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
- `layout.ts`: packs the faces with the live site's packer (all rules,
  obstructions), in portrait and landscape.
- `draw.py`: draws the result for the customer or installer.
