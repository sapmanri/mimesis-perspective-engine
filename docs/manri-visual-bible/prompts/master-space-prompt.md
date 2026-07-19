# Master Space Prompt

모든 생성의 뿌리. 어떤 컷을 만들든 **[SPACE] + [LOCKS](아래) + 목적별 프롬프트 + [NEGATIVE]**
순서로 조립한다. 잠금 블록은 생략 금지.

## [SPACE] — 고정 공간 프롬프트

```text
A single-room private library in an old house, 7.2m by 5.4m, ceiling 3.1m with three
exposed walnut beams running east-west. Lime plaster walls in warm greige (#B9AE9E),
oak plank floor (#8A6F4D) with a faded madder-red wool rug (2.8x2.0m) at the center.
South wall: floor-to-ceiling walnut bookshelves flanking a single oak entrance door;
a pendulum wall clock. East wall: bookshelves with a brass ladder rail, and a small
deep-silled window. North wall: one tall sash window (90x180cm) with soft diffuse
north light, an old oak writing desk beneath it with a matte black typewriter and a
brass lamp with green glass shade. West wall: a grey sandstone fireplace (opening
80x70cm, mantel at 1.2m) with low long-burning fire, a walnut rocking chair with an
ochre linen cushion angled toward it, a small round walnut side table with a chipped
white enamel mug. Northeast corner: a deep moss-green wool armchair with an oatmeal
wool blanket, three knee-high stacks of books on the floor, a brass floor lamp with
a linen shade, a blue cloth-bound book on the armrest, ivy plant on the east window
sill. The room is lived-in for decades: wear only where hands and feet actually go.
Three pools of light — orange firelight (1900K), grey-white north window light
(5000K), warm lamp light (2400K) — separated by calm shadow.
```

## [LOCKS] — 모든 프롬프트에 동봉

### continuity lock

```text
CONTINUITY: This is the same room in every image. Keep identical: room dimensions and
wall/window/door positions; fireplace on west wall; desk under north window; armchair
in northeast corner; entrance on south wall; the 12 fixed objects (round side table,
chipped enamel mug, rocking chair, brass desk lamp with green shade, typewriter with
a half-typed page, blue cloth book, oatmeal blanket, ivy on east sill, pendulum clock
on south wall, ladder on east rail, willow log basket, central faded rug). Never add,
remove, move, or restyle furniture or these objects.
```

### camera lock

```text
CAMERA: 35mm full-frame lens for all normal views.
The entrance signature reference cut alone may use a restrained 28mm full-frame lens
to establish the spatial relationship of all three seats in one room.
No lens wider than 28mm. Eye height 150cm standing / 100-115cm seated.
Aperture f/4 (f/2.8 only for the armchair corner). Human walking-pace movement only.
No drone shots, no orbit, no crane, no fisheye, no speed ramps, no slow motion.
```

(28mm 예외의 근거 — Vase 판정 2026-07-19: 35mm ±27° 화각으로는 문에서 흔들의자
38°·큰 의자 30°가 프레임 밖 — 35mm라 적고 광각 구도를 요구하면 조상 컷부터 카메라
헌법이 거짓이 된다. 24mm는 방이 실제보다 넓고 웅장해지므로 금지. 좌석별 기준 컷부터
다시 35mm 고정.)

### material lock

```text
MATERIALS: walnut (furniture, shelves) and oak (floor, desk) with matte oil finish —
never glossy varnish; lime plaster walls; brass and black iron metals only; linen,
wool, enamel, old wavy glass. Aged by decades of use, never staged vintage, never new.
```

### layout lock

```text
LAYOUT: One room, three seats visible from each other across the central rug.
Entrance south, fireplace west, desk north-under-window, armchair northeast.
This layout never changes between generations.
```

## 기준 컷 (첫 확정 대상)

```text
[SPACE] + [LOCKS] + View from the entrance door looking north into the room, eye
height 150cm, restrained 28mm full-frame lens: firelight and the edge of the rocking
chair on the left, desk beneath the north window at center distance, the window
holding the last fading blue-grey dusk light rather than glowing daylight, lamp
light and the partial outline of the armchair on the right, rug edge in the lower
foreground. All three pools of light visible as parts of one continuous room.
Early evening. One quiet trace of recent presence: a last faint thread of steam
still rising from the enamel mug on the side table, as if someone rose from the
rocking chair only moments ago. No one waiting, nothing staged. Show only what
this viewpoint would naturally reveal; do not force every fixed object to face
the camera or become fully visible. + [NEGATIVE]
```

- 흔적의 규칙 (Vase 판정): 이 방은 전시장이 아니라 **예약이 있는 공간**이다 — 방금
  누군가 쓰고 일어난 흔적 **하나만** 허용 (머그의 옅은 김). "사용자를 기다리는 연출"은
  절대 금지 — 기다림이 아니라, 조금 전까지 사용되고 있었다는 사실만.

- 저녁 기준 컷의 빛 해석 (Vase 판정): firelight 1900K · lamp 2400K · 북창은
  **fading blue-grey dusk ambient light**. [SPACE]의 5000K 회백 북광은 **낮 장면의
  규칙**으로 남고, 저녁 컷에는 강제 적용하지 않는다.
- 기준 컷의 목적은 세 좌석의 상품 사진이 아니라 **세 자리가 같은 방 안에 존재한다는
  관계의 증명**이다. 좌석의 온전한 모습은 이후 35mm 좌석별 기준 컷에서 검증한다.

검수 통과한 기준 컷 1장을 이후 모든 생성의 image reference로 사용한다.
