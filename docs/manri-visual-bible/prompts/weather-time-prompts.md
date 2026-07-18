# 시간·날씨 변형 프롬프트

목적별 프롬프트 뒤에 **정확히 하나의 시간 + 최대 하나의 날씨/계절**을 붙인다.
구조·가구는 절대 언급하지 않는다 (변형 프롬프트는 빛과 창밖만 다룬다).

## 시간

```text
TIME dawn: windows glow blue-grey (#6E7B8B); the room is almost monochrome shadow;
only embers breathe in the fireplace; 1.5 stops darker than baseline.

TIME morning: baseline exposure; a single low shaft of light from the east window
draws the window-frame's shadow on the floor; north light even and grey-white.

TIME afternoon: north light half a tone warmer; shadows slightly longer; fire low.

TIME evening: handover hour — daylight fading amber through the windows (#8B6B4F),
fire and lamps taking over as key lights; one candle lit on the mantel.

TIME night: windows nearly black (#1C2430); only the three light pools remain —
fire, desk lamp, floor lamp; everything between them reads as calm silhouette.
```

## 날씨·계절

```text
WEATHER rain: windows a blue-grey (#39465A); slow raindrop trails on the east
window glass only; interior half a stop darker; fire and lamps relatively stronger.

WEATHER snow: windows a pale cold white (#AEB8C2); slow vertical snowfall outside
only; a cool quiet reflected light near the sills; the room feels more silent.

SEASON winter: the fire always burning; blanket in use on the armchair; faint
condensation at the lower window panes.

SEASON spring: ivy on the sill slightly fuller; curtains stir occasionally; fire
reduced to embers; windows brighter.
```

## 조합 규칙

- `TIME` 1개 필수, `WEATHER`/`SEASON` 합쳐 1개까지.
- 허용 예: `TIME night + WEATHER rain` (C석 최적), `TIME evening + SEASON winter` (A석 최적),
  `TIME morning` 단독 (B석 최적).
- 금지: 두 시간대 혼합, 비+눈 동시, 실내 안개·실내 빛줄기 연출 추가.
