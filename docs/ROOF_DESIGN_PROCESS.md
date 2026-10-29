# Roof design process — finding roof lines and laying out panels

How EasyLink works out a roof's faces and lines and fits panels to them.
This is the process that produced the verified layouts for 95 and 85 Bombay
St, Lidcombe (Oct 2026). Code lives in `src/lib/designer/`. **Keep the
lessons log at the bottom up to date**: every time a roof comes out wrong,
write down what happened, why, and what changed in the code.

## Top priority — never missed (owner's rule, 30 Oct 2026)

Every design, by hand or on the live page, whatever found the roof:

1. **Identify the faces.** Every face of the roof is found; none are left
   out, and none are merged across a hip, valley or ridge.
2. **Draw the border of each face.** Every face is drawn with its own border
   (eaves, hips, valleys, ridges), inside the roof outline. On the live
   page each face is drawn on the map (`savedFaces`, amber lines).
3. **Never place a panel on a roof line.** Every panel sits inside one face,
   100 mm clear of every line of that face and of the outline. The live page
   checks this last, after any packer or Beautify (`keepPanelsClear` in
   `panelClearance.ts`), and removes any panel that fails.

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
   **4a. Street View (every design).** Fetch the street-side view: the
   Street View Static API with `location=<address>&source=outdoor`
   (metadata call free; image about 1c). It confirms what the satellite
   view can't show:
   - gables versus hips;
   - tile versus metal, and lower roofs (bays, verandahs, awnings);
   - steepness;
   - antennas and chimneys.
   It only shows the street side and can be years old, so it confirms;
   the satellite image still decides the faces.
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
   - **Always run `check-eaves.py roofs/x.json crop.png`** (add `--metal`
     for sheet roofs). It measures where the tiles end across every eave.
     A dark band along an eave is gutter plus shadow, not roof. Tiles are
     tested by red minus green, because cream walls and gutters also pass a
     red-minus-blue test. On 57 Harry Ave, two eaves were 0.3 m and 0.6 m
     outside the tiles, so panels would have overhung the gutter.
6. **Obstructions.** **Always run `find-obstructions.py roofs/x.json
   crop.png out.png`, and review every NEW candidate on a close-up.**
   - Spots are vents, whirlybirds (circulating fans), antennas and flues.
   - Lines are level differences (steps), which often end part way across
     a section. Never dismiss a line as a flashing.
   - The dark wedge where a higher section shades a lower one is an
     obstruction too.
   - On tiles the finder is noisy (tile gaps, hip shadows). Raise `--thr`
     to 22 and review by eye.
   Trace each real one at its true shape and pass it to the packer as
   `obstructions` (with a name in `obstruction_names`). Steps that end
   part way across a section are thin obstruction strips. The packer keeps
   100 mm clear and packs around them. Never delete panels afterwards (see
   lesson 4).
7. **Pack.** For each face, pack rows along its eave with its own pitch
   (the panel's depth up the slope is shortened by cos(pitch) in plan). Do
   this for portrait and for landscape, and offer both totals.
8. **Scale (screenshots only).** Fit the image's face centres to Google's
   face centres (lat/lng) to get metres per pixel. This came out at
   0.0242–0.0252 m/px for the Bombay St screenshots.
9. **Beautify Design (optional).** `beautify.py sections.json out.json`
   lays each section out for looks and access after the normal packer has
   shown the most the roof holds:
   - one shared grid per section, so columns line up;
   - strips of 2 rows, with an access gap every 20 columns and a 0.8 m
     walkway between strips;
   - only full rectangles kept (ragged ends trimmed), blocks under 8
     panels dropped, the grid centred for even margins;
   - neighbouring sections use the same row direction where their edges
     allow, so strips run parallel across the roof.
   The 100 mm setback, one orientation and one-section rules still apply.
   On UTS Block A: 908 panels in strips (400 kW) against 1,511 packed
   (665 kW). The walkways also give access for maintenance and the wind
   edge zones that commercial roofs need.

## Lessons log

Newest first. Add an entry whenever a design comes out wrong.

### 2026-10-30 — 25 Gilbert St, Colyton (dark-tile T/L hip roof): hand method put on the live page
1. **Hand design:** the walls are square (14.8°), so the outline was drawn as
   rectangles in the wall frame. Faces were then *computed*, not read: on a
   square-walled, equal-pitch hip roof, a point belongs to the wall it is
   nearest in the L-infinity sense, and ties at an inside corner go to the
   wall whose own line is that far, which gives the 45° valley. All 8 faces
   matched Google's 8 segments to within about 2.5 m² each. Result: 49 landscape.
2. **Live finder, before the fix:** the colour trace leaked onto the NE
   patio and the north lawn, the eaves were wavy, and the faces from the
   2018 height model crossed the hips seen in the image.
3. **Fix (`src/lib/designer/squareRoof.ts`):**
   - The roof edge is found on 25 cm cells laid along the walls. A cell's
     average colour allows a strict test.
   - Parts the test drops are given back when only slightly off-colour (a
     face in sun or shade), except where they stick out.
   - Steps under 1 m, and small corner steps, are moved to the inner line.
   - Hips are computed from the walls.
   - The result is used only when Google's segments confirm it: the share
     of roof facing each way must agree within 0.1, and the area must reach
     at least 85% of Google's. Otherwise the old path runs, so gable roofs,
     row houses and flat roofs are unchanged.
4. **Checked on the earlier roofs:**
   - Gilbert: 8 corners, 8 faces, 49 landscape, the same as by hand.
   - 134 Old Canterbury Rd: square outline and hips matching the hand design.
   - Frampton, Derwent, 57 Harry, 61 Harry and Frances: no change (not
     confirmed, so the old path runs).
5. **Street View** for Gilbert: the house is hidden by a street tree. The
   hips were confirmed by Google's segments, which face 4 ways.

### 2026-10-29 — Terraces on the live page: Side walls tool, Street View facing the house
1. **Automatic party-wall detection was tried and dropped.** The method:
   a brightness profile across the row, with the band around the pin taken
   as the house.
   - On 24 Derwent St it found the band at −4.5 / +0.2 m, against the
     owner's −4.2 / +0.5 m.
   - On detached houses it took ridges and hip lines for party walls:
     134 Old Canterbury Rd went from 54 panels to 23, and 61 Harry Ave was
     cut in half.
   - A height-model "not a ridge" test also rejected the real 24 Derwent
     wall, because the gap beside it dips 2 m.
   Not shipped.
2. **Vision AI was tested on the same task and failed.** Grok 4.20 and
   Opus 4.6 both got the wall direction wrong; Opus also gave a 7.5 m
   frontage, against the real 4.7 m.
3. **Shipped instead:**
   - **Side walls** button (view mode, next to Beautify): click two points
     along one party wall, then one point on the other. The roof is cut to
     the strip between them and the panels are laid out again. "Remove side
     walls" undoes it; editing and saving the roof clears it.
   - **Street View faces the house.** The route reads the camera position
     from the metadata and sets the heading towards the pin. Before, the
     default heading followed the road and showed the neighbours' fences.

### 2026-10-29 — 24 Derwent St, Glebe (attached row houses)
1. **The live page put panels on two neighbouring houses.** Terraces share
   one continuous metal roof, and the NSW lot (Lot 72 DP246732, 433 m²)
   covers several houses, so the lot boundary cannot separate them.
2. **Party walls decide the house.** The owner marked the walls between the
   houses; they line up with the front fences in Street View and the
   side-wall shadows on the roof. The house is the 4.7 m strip between two
   walls, with the pin in it. The strip was straightened to read the faces:
   - front main roof facing the street (NE);
   - a small back slope, too small for panels;
   - the rear wing facing NW.
   These match Google's segments in the strip.
   Obstructions: the vent and the two skylights.
3. **Result:** 27 landscape (11.9 kW) or 23 portrait (10.1 kW), all inside
   the house's own walls.

### 2026-10-29 — UTS Block A, Haymarket (large flat commercial roof)
1. **The live page treats one big building as one roof.** Its outline took
   in the courtyard trees, rooftop plant and lower sections. A building
   about 100 m across also doesn't fit the zoom-21 frame, so this design
   used a zoom-20 mosaic of six Static Maps tiles (0.062 m/px).
2. **Sections by material and step line.** A material map separated white
   sheet roof, tan deck, plant and shadows. Every dark line darker than its
   surroundings was cut out, plus five step lines drawn by hand where they
   were faint. Each remaining area became one section: 7 sheet sections
   and 1 deck section, about 4,050 m² of usable roof. Plant, skylights and
   vents inside a section are obstructions. The height model confirmed one
   main level, about 20–22 m.
3. **Rows run along each section's longest edge** (the building is not
   square, so there's no single wall direction).
4. **Result:** 1,511 landscape (665 kW) or 1,480 portrait (651 kW) under
   the residential rules. Not yet allowed for:
   - wind edge and corner zones;
   - maintenance walkways;
   - access to plant.
   A real layout will be lower. The packer starts each row at the section
   edge, so rows are staggered on irregular sections; align them into
   columns for the final design.
5. **Above 100 kW the system is large-scale:** LGCs, not STCs. Network
   connection is negotiated with Ausgrid. The residential pricing engine
   doesn't apply.

### 2026-10-29 — Live Designs page: lot boundary and Street View (134 Old Canterbury Rd)
1. **The live page traced three houses as one roof.** Neighbouring houses
   have similar tiled roofs with only a shaded side passage between them.
   The colour growth crossed those gaps, the joined roof (430 m²) ran off
   the image, and the page fell back to Google's mask, which also joins
   them. *Fixed in `roofSnapshot.ts`:* the property's land lot from the NSW
   cadastre (already loaded by the page) limits the roof, with 0.15 m of
   allowance. 0.5 m reached the neighbour's tiles, because the lot line runs
   down the middle of the side passage. Google's mask fallback is clipped
   to the lot too.
2. **One straightened outline corner landed 24 m away**, where two nearly
   parallel lines met, and drew a line across the neighbours. *Fixed in
   `roofLines.ts`:* if a rebuilt corner falls more than 1 m outside the
   traced roof, the traced outline is kept.
   Result: 47 portrait / 54 landscape (by hand: 48 / 56).
3. **Street View on the Designs page.** `/api/solar/street-view` serves the
   photo (free metadata check first, then about 1c an image) as a thumbnail
   in the corner of the map; click to enlarge. It is left out of the
   proposal screenshot.

### 2026-10-29 — 134 Old Canterbury Rd, Summer Hill (dark-tile hip roof) and Street View
1. **Street View is now part of every design (step 4a).** On 8 Temple St,
   Stanmore, it showed what the satellite view hid: a front gable over a
   bay window with a green metal roof, and a metal verandah. Those were
   the dashed lines the live page had packed panels across. On 134 Old
   Canterbury Rd it confirmed a hip end to the street and no lower roofs.
2. **The eave check failed on dark brown tiles.** These tiles score about
   +30 on red minus green, below the default threshold of 35 (set for
   terracotta), so every eave read 0.3–0.6 m "inside". Fix: measure a row
   across the eave first, then use `--rg 12` for dark tiles. With that,
   all four eaves were confirmed within 50 mm.
3. **Four faces** (N and S hip ends, E and W faces), confirmed by Google
   within 3° and 0.1% of area. Result: 56 landscape (24.6 kW) or 48
   portrait (21.1 kW), three-phase.

### 2026-10-28 — Live Designs page: obstruction finder, spike fix, no loading rectangle
1. **Loading rectangle.** Google's building box was drawn as a cyan
   rectangle while the zoomed image was analysed. *Fixed:* the preview
   draws only the traced roof, once the analysis is done
   (`useImperativeRoofOutline`).
2. **Spike on 1 Frampton St.** A face corner rebuilt from two nearly
   parallel lines landed 2 m past the north-east wall, so a face line ran
   off the roof. *Fixed in `roofLineCorrect.ts`:*
   - `keepFacesInsideRoofs` pulls any corner outside every outline back
     onto the nearest outline edge;
   - `facesValid` now also rejects corrections that put a corner more than
     0.15 m off the roof.
3. **Obstructions on the live page.** *Added:* `roofObstructions.ts`
   (`findRoofObstructions`), the same method as `find-obstructions.py`. It
   looks for spots and steps in the zoomed image's brightness inside each
   face, away from the face edges.
   - **White or light sheet roofs:** a pixel counts if it is 18 grey
     levels below its surroundings.
   - **Tiles** (texture noise reaches −32): 22 grey levels, plus a dark
     core, with at least a tenth of the group darker than −35.
   - Spots within about 25 cm of each other are merged into one.
   - Dark shadow bands at steps and strips count as steps, so strips get no
     panels.
   - The packer packs around everything found, and the page draws each one
     as an orange box and counts them in the status text.
   - On tiles it errs towards flagging: shaded tile texture can be flagged
     too, and the installer checks on site.
4. **Snapshots use `format=png32`** (the full-colour image) in both routes.
5. **Results on Google data** (`scripts/roof-design/live-pipeline.ts`,
   drawn with `live-draw.py`), portrait / landscape:
   - 1 Frampton St: 60 / 66 (was 82 / 91; manual 60 / 65);
   - 57 Harry Ave: 24 / 27 (manual 22 / 25);
   - 66 Frances St: 89 / 102 (manual 89 / 84);
   - 61 Harry Ave: 33 / 35 (manual 22 / 25).
   Faces still come from the height model. Reading faces from the image
   (as in the manual process) needs an AI model: Claude Opus 5.5 in Bedrock
   (Sydney) needs the model agreement accepted and the tokens-per-minute
   quota raised from 0.

### 2026-10-28 — 1 Frampton St, Lidcombe (long hip roof, cross strips, lower south wing), and a live-site check
1. **Live Designs page, same address.**
   - While the roof loads, the map shows a cyan rectangle (Google's
     building box, the fallback in `useImperativeRoofOutline`). The page
     then opens in edit mode with the traced roof selected, in amber.
   - The old yellow rectangle is gone, but the amber outline had a spike
     running off its north-east corner.
   - The live site gave 87 portrait / 92 landscape panels (400 W), with no
     obstructions, and panels on the north strips.
2. **Our process gave 60 portrait / 65 landscape** (the north strips are excluded from packing).
   - The north end meets a neighbour's roof on a party line. The tiles
     continue past it, so `check-eaves.py` reports "move out" there. It
     is not an eave: keep the line.
   - Steps and shadow bands are face edges where the roof does continue
     beyond them, so "move out" flags on them are expected too.
   - The photo sits about 1.6 m north of the height model
     (`google_offset_px` [0, -52]).
   - Obstructions: a chimney or vent box at the west eave, a dark
     triangular vent, a white flue, a dark vertical feature at the
     north-east edge, and a short step by the south notch.

### 2026-10-28 — Revision after owner review: obstructions (66 Frances St, 57 Harry Ave)
The owner marked what the designs missed on 66 Frances St:
- circles: antennas or circulating fans;
- lines: level differences.
1. **What I had:** the vent on A, the vent on C and the big fan in block D.
   **What I missed:**
   - a fan just below block D;
   - two short level differences in the rear roof's south-west part, which
     I had called flashings;
   - the shadow wedge of step A falling onto B.
   I had also placed one vent 0.7 m from where it really is.
   Why: I read obstructions by eye, only where they caught my attention.
   *Added:* `find-obstructions.py`, which lists every dark spot and thin
   line inside the faces, both new and already covered. It found all of
   the owner's marks.
2. **57 Harry Ave, same check.** Two more vents on the WNW face: a white
   capped pipe near the eave, and a small vent below the one already
   traced.
3. **57 Harry Ave eaves were never checked** (step 5 was skipped).
   *Added:* `check-eaves.py`. It found:
   - the east wing's south eave 0.45–0.6 m outside the tiles (it sat on
     the gutter and shadow band);
   - the south wing's east eave 0.29 m out;
   - the west and north eaves 0.23 m and 0.11 m inside the tiles.
   All are fixed. The east wing's south eave was moved in a further
   200 mm (shaded last row of tiles): check on site.
4. **Revised results:**
   - 66 Frances St: 84 landscape (37.0 kW), 89 portrait (39.2 kW); was
     96 / 95.
   - 57 Harry Ave: 25 landscape (11.0 kW), 22 portrait (9.7 kW); was
     26 / 25.

### 2026-10-28 — 66 Frances St, Lidcombe (white low-pitch metal roof, about 320 m²)
1. **White metal roof: the plain image shows almost no lines.** Raising
   the contrast just blows the whole roof out to white. *Added:*
   `local-contrast.py`, which shows the image minus its blur, ×5, on a
   grid. Section edges and the steps between sections show clearly.
2. **Steps appear as a thick dark band.** It is the shadow of the higher
   section, falling on the lower one. Face edges go on each section's own
   side of the band, so no panel sits in the shadow.
3. **The sections**, from the image:
   - A: the front-left block, crossed by a diagonal fold corner to corner,
     so two faces;
   - B and C: blocks stepping down to the south-west;
   - D: a small vent block, treated as one obstruction;
   - E: the main skillion falling ESE (the height model shows about 1 m of
     fall), wrapping around F;
   - F: a framed box with a large dark oval, treated as an obstruction.
   ~~Thin lines that stop part way across a section are flashings or
   shadows.~~ **Wrong (owner review):** they are level differences. See
   the revision below.
4. **`confirm-google.py` skipped every segment**, because it treats pitches
   under 5° as flat. *Added:* `flat_roof: true`. Low-pitch segments then
   count, and position and area are checked, but not facing. Google's
   83 m² west segment covers A, B and C together. The total was −2.0%.
5. **Size limits matter here, not roof space.**
   - At 96 panels (42 kW), the 200% rule needs at least a 21 kW
     three-phase inverter.
   - The 133% rule needs 32 kW, which is above 30 kW (10 kW per phase on
     three phases), so export limiting is needed.
   - Check the network connection rules for a system this size.
   - The design should be sized to the customer's use, not to fill the
     roof.

Result:
- 96 landscape (42.2 kW): A 3+3, B 7, C 3, E 74, F 6.
- 95 portrait (41.8 kW).
Flush mount at 1.7–4.9°.

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
- `find-obstructions.py roofs/x.json crop.png out.png [--thr]`: every dark spot (vent, fan, antenna) and thin line (level difference) inside the faces, for review (step 6).
- `check-eaves.py roofs/x.json crop.png [--metal]`: where the tiles or sheets end across every eave (step 5).
- `live-pipeline.ts <lat> <lng> <outDir>` (set GKEY, NODE_USE_ENV_PROXY=1 in the workspace) and `live-draw.py <outDir>`: run and draw the live page's pipeline on Google data.
- `beautify.py sections.json out.json [--rows --cols --walk --orient --min-block]`: Beautify Design (step 9).
- `local-contrast.py x0 y0 x1 y1 scale out.png`: local-contrast gridded view for white or grey metal roofs.
- `layout.ts`: packs the faces with the live site's packer (all rules,
  obstructions), in portrait and landscape.
- `draw.py`: draws the result for the customer or installer.
- `complex/`: the multi-wing tools used on 77 Harry Ave (line detection
  and intersections, faces from the height model, partition, hybrid
  outline, L∞ hip-roof faces, line verification, packing).
