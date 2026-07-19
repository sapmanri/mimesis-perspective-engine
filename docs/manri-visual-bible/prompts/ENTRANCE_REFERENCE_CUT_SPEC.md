# BUILD — 입구 기준 컷 생성 명세 (단 한 장)

- 상태: 생성 대기 (Vase가 외부 도구로 생성 — 세션에 이미지 생성 도구 없음)
- 원칙 (Vase 판정 2026-07-19): **첫 생성은 공간 서명인 입구 기준 컷 한 장만 뽑는다.**
  한 번에 세 좌석 이미지를 만들면 잘못된 공간이 세 갈래로 굳는다. 이 한 장이 전수
  대조를 통과하기 전에는 어떤 다른 컷도 생성하지 않는다.

## 1. 왜 이 컷인가

문에서 북쪽을 향해 선 첫 시점 — 세 개의 빛 웅덩이(불 1900K · 북창 5000K · 스탠드
2400K)가 한 프레임에 모두 걸리는 유일한 장면이다 (`spatial-layout.md` 4절: "이 공간의
서명"). 통과한 1장은 이후 모든 생성의 image reference가 된다.

## 2. 완성 프롬프트 (조립 완료본 — 그대로 복사해 사용)

조립 규칙: [SPACE] + [LOCKS 4종] + 기준 컷 뷰 + [NEGATIVE] (`master-space-prompt.md`).
아래는 그 전문이다.

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
Three pools of light — orange firelight (1900K), the last fading blue-grey dusk
light in the north window, warm lamp light (2400K) — separated by calm shadow.

CONTINUITY: This is the same room in every image. Keep identical: room dimensions and
wall/window/door positions; fireplace on west wall; desk under north window; armchair
in northeast corner; entrance on south wall; the 12 fixed objects (round side table,
chipped enamel mug, rocking chair, brass desk lamp with green shade, typewriter with
a half-typed page, blue cloth book, oatmeal blanket, ivy on east sill, pendulum clock
on south wall, ladder on east rail, willow log basket, central faded rug). Never add,
remove, move, or restyle furniture or these objects.

CAMERA: 35mm full-frame lens for all normal views.
The entrance signature reference cut alone may use a restrained 28mm full-frame lens
to establish the spatial relationship of all three seats in one room.
No lens wider than 28mm. Eye height 150cm standing / 100-115cm seated.
Aperture f/4 (f/2.8 only for the armchair corner). Human walking-pace movement only.
No drone shots, no orbit, no crane, no fisheye, no speed ramps, no slow motion.

MATERIALS: walnut (furniture, shelves) and oak (floor, desk) with matte oil finish —
never glossy varnish; lime plaster walls; brass and black iron metals only; linen,
wool, enamel, old wavy glass. Aged by decades of use, never staged vintage, never new.

LAYOUT: One room, three seats visible from each other across the central rug.
Entrance south, fireplace west, desk north-under-window, armchair northeast.
This layout never changes between generations.

View from the entrance door looking north into the room, eye height 150cm,
restrained 28mm full-frame lens:
firelight and the edge of the rocking chair on the left,
desk beneath the north window at center distance,
the window holding the last fading blue-grey dusk light rather than glowing daylight,
lamp light and the partial outline of the armchair on the right,
rug edge in the lower foreground.
All three pools of light visible as parts of one continuous room.
Early evening.
Show only what this viewpoint would naturally reveal; do not force every fixed object
to face the camera or become fully visible.

NEGATIVE: no people, no faces, no hands, no text or readable lettering, no captions,
no watermarks, no modern devices (screens, phones, LEDs, outlets in view), no ceiling
lights, no candles multiplied into clusters, no christmas or holiday decor, no neon,
no purple or magenta tones, no saturated primary colors, no pure white, no teal-and-
orange grading, no HDR look, no lens flare, no heavy bokeh discs, no fisheye or
ultra-wide distortion, no drone or crane perspective, no showroom cleanliness, no
staged vintage prop clutter, no fantasy or oversized architecture, no floating or
duplicated objects, no roaring bonfire flames, no rain indoors, no fog indoors,
no cinematic letterbox bars, no vignette heavier than subtle.
```

## 3. 생성 파라미터 (도구 무관 권장)

- 렌즈: **이 컷만 28mm** (Vase 판정 — 35mm ±27°로는 흔들의자 38°·큰 의자 30°가
  프레임 밖. 24mm는 방이 웅장해지므로 금지. 좌석별 컷부터 다시 35mm 고정).
- 비율 3:2 (풀프레임 화각), 도구가 지원하는 최고 해상도.
- 도구가 앞쪽 토큰에 가중치를 주는 경우(Midjourney 계열), View 문단을 프롬프트
  맨 앞으로 올려 붙여도 된다 — 내용 변경은 금지, 순서 조정만 허용.
- seed·도구명·버전을 생성 즉시 기록한다 (통과 컷의 재현 정보).
- 후보는 여러 장 뽑아도 되지만 **확정은 1장** — 확정 전에는 어떤 좌석별 컷도 만들지 않는다.

## 4. 전수 대조 체크리스트 (통과 = 전 항목 예)

평면·구도 (`spatial-layout.md` 3~4절 — **확정 기대치**: 세 좌석의 상품 사진이 아니라
세 자리가 같은 방에 존재한다는 관계의 증명):
- [ ] 시점이 남벽 중앙 문 앞, 눈높이 150cm, 북향인가 (내려다보거나 올려다보지 않는가)
- [ ] 왼쪽: 벽난로의 불빛 + 흔들의자의 **일부 실루엣** (완전한 형태 요구 폐기)
- [ ] 중앙: 북창 아래 책상·타자기 자리의 구조가 **가장 명확**한가
- [ ] 오른쪽: 스탠드 빛 + 큰 의자의 **일부 윤곽**
- [ ] 전경 하단에 러그 가장자리가 걸리는가
- [ ] 방이 7.2×5.4m로 보이는가 — 28mm임에도 대저택·홀처럼 넓어 보이면 폐기

빛 (`lighting-and-camera.md` + 저녁 기준 컷 해석):
- [ ] 세 빛의 웅덩이가 **하나의 방 안에서 연결되어** 보이는가 (삼분할 그림엽서화 금지)
- [ ] 색: 불=주황(1900K), 북창=**푸른 회색 잔광**(대낮처럼 빛나면 폐기), 스탠드=온광(2400K) — 보라·마젠타·틸앤오렌지 없음
- [ ] 천장 조명·촛불 군집·렌즈플레어 없음

오브젝트 12종 (`object-continuity.md` — 이 프레임에서 확인 가능한 것 전수):
- [ ] 흔들의자(오커 리넨 쿠션)· 원형 테이블·이 빠진 법랑 머그 (좌)
- [ ] 타자기(반 타이핑 종이)·녹색 갓 황동 램프·책상 (중)
- [ ] 큰 의자(모스그린)·오트밀 담요·푸른 책·스탠드·책 더미 3무더기 (우)
- [ ] 중앙 러그·남벽 진자 시계·동벽 사다리 레일(걸리는 경우)

카메라·재질:
- [ ] 28mm 절제된 원근 — 어안·초광각 왜곡 없음, 드론·크레인 시점 아님, 24mm급 과장 없음
- [ ] 무광 목재·황동·리넨 — 광택 니스·새것 느낌·소품 전시장 과밀 없음
- [ ] 사람·손·글자·워터마크 없음

폐기 기준은 `negative-prompts.md` 하단 5항과 동일 — 하나라도 걸리면 폐기 후 재생성.

## 5. 실패 시 절차

**같은 프롬프트를 무작정 재생성하지 않는다.** 어떤 항목이 왜 실패했는지 먼저 기록한
뒤, 실패 항목만 프롬프트 말미에 보강 문장으로 추가해 재생성한다. **[SPACE]·[LOCKS]의
공간 정의 자체는 수정하지 않는다** — 정의를 고쳐야 통과할 것 같다면 그것은 생성
문제가 아니라 Visual Bible 개정 사안이므로 Vase 판정으로 간다.

## 6. 통과 후

1. 통과 컷을 `docs/manri-visual-bible/reference/entrance-reference.png`(예정)로 저장,
   seed·도구 기록과 함께 커밋.
2. 이후 순서 (Vase 확정): 좌석별 기준 컷 생성(이 이미지를 image reference로) →
   오브젝트 대장·평면·빛·카메라 전수 대조 → 통과 시에만 다음 좌석 → 이동 프로토타입
   → 마지막으로 대화 결합.
