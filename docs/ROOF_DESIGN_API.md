# Roof-design API

EasyLink's roof designer for systems outside the platform (CRMs, partner
tools, internal services). It runs the same engine as the Designs page
(`src/lib/roof-design`), so results match what a designer sees on screen.

## Enable it

Set one or more keys (at least 16 characters each, comma-separated) in the
web server's environment and restart:

```
ROOF_DESIGN_API_KEYS=key-for-partner-a,key-for-crm
```

Until a key is set the endpoint answers `503`. Each key may make 30 designs an
hour (`429` with `Retry-After` beyond that). Remove a key to revoke it.

## Request

```
POST https://www.easylinksolar.com.au/api/roof-design
x-api-key: <key>            (or Authorization: Bearer <key>)
Content-Type: application/json

{ "address": "11 Melton St S, Auburn NSW 2144" }
```

| Field | | |
| --- | --- | --- |
| `address` or `lat` + `lng` | required | Australian address (geocoded), or the pin |
| `orientation` | optional | `PORTRAIT`, `LANDSCAPE` or `best` (default: the design rules' default) |
| `beautify` | optional | `true` for aligned blocks instead of the most that fit |
| `panelWatts` | optional | panel power for kW and inverter sizing (default Google's panel) |
| `outline` | optional | roof outline(s) drawn elsewhere, `[[{lat,lng},…]]` — skips finding the roof |
| `includeImage` | optional | `true` adds the drawing on the satellite image (JPEG, base64) |

## Response

```
{
  "status": "READY",                       // or "NO_ROOF" with a message
  "pin": {lat,lng}, "formattedAddress": "…",
  "outline": { "rings": [[{lat,lng}…]], "source": "square-walls|snapshot|footprint|google-mask|google-box", "needsVerification": false, "areaM2": 113 },
  "faces": { "source": "square-hip|height-model|assumed-hip", "gables": 1, "items": [{ "ring": […], "pitchDeg": 26, "azimuthDeg": 0 }] },
  "obstructions": [{ "ring": […], "kind": "spot|step" }],
  "lines": { "total": 30, "checked": 30, "ok": 19 },
  "panels": { "orientation": "PORTRAIT", "count": 21, "counts": {"PORTRAIT":21,"LANDSCAPE":29}, "watts": 400, "dims": {…},
              "items": [{ "center": {lat,lng}, "rotationDeg": 0, "slopeDeg": 26, "corners": [4 × {lat,lng}] }] },
  "systemKw": 8.4, "roofPitchDeg": 26.1,
  "inverter": { … },                       // 200% DC:AC hybrid / 133% standard, 10 kW export per phase
  "notes": ["…"],
  "image": null                            // or { "contentType": "image/jpeg", "base64": "…" }
}
```

Errors: `400` bad body, `401` key, `422` address not found, `429` rate limit,
`502` design failed, `503` API not enabled.

The rules applied are in `docs/ROOF_DESIGN_PROCESS.md` (100 mm setback, one
orientation, panels inside one face, rows along the walls, lines checked
against the image, obstructions packed around).

## From inside the platform

Don't call the HTTP API from platform code; import the engine:

```ts
import { designRoof, findRoofFaces, layoutRoofPanels } from "@/lib/roof-design";   // browser or Node
import { designRoofAt, renderRoofDesign } from "@/lib/roof-design/server";          // Node only
```
