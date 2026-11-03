// Fitting data for the rendered PNG parts. Edit with fit.html (it prints this
// surfaceNudges section) or by hand. All coordinates use the 1024 px canvas.
// surface.js computes the body-aware fit; surfaceNudges applies final corrections.
//
// shapes:  per body shape, per layer group: nudge (dx, dy), scale about the
//          group's pivot, rotation in degrees, flip. Classic is the baseline
//          the parts were fitted on, so it is empty.
// parts:   the same fields for one specific part ('group/key'), or for one
//          part on one shape ('group/key@shape'), applied on top. `spread`
//          moves the left half of the image left and the right half right by
//          that many px, for two-sided parts like earbuds.
// pivots:  the point each group scales and rotates around; 'group/key' entries
//          override the group's pivot for one part.
// recolor: parts generated in the red master color that follow the hat color.
// capText: where the initials sit on each text-capable hat.
// laptop:  the lid's four corners (TL, TR, BR, BL) for sticker projection.

export const FIT = {
  // Rear surfaces measured on the original artwork. Only these regions pass
  // behind the wearer; front brims, fur cuffs and decorative leaves stay whole.
  // Paths are in the shared 1024 px source canvas, before silhouette fitting.
  wrap: {
    'hat/bucket': { behind: 'body', path: 'M322 240 C430 241 595 231 702 240 L710 300 L312 300 Z' },
    'hat/propeller': { behind: 'body', path: 'M389 264 C450 233 581 228 641 264 L656 300 L375 300 Z' },
    'hat/beret': { behind: 'body', path: 'M423 271 C452 228 612 210 673 224 L707 300 L413 300 Z' },
    'hat/tophat': { behind: 'body', path: 'M358 225 C438 252 588 252 669 225 L682 295 L345 295 Z' },
    'hat/sunhat': { behind: 'body', path: 'M251 271 C363 282 426 319 512 318 C601 318 674 288 770 270 L790 374 L235 374 Z' },
    'hat/wizard': { behind: 'body', path: 'M373 234 C430 224 469 253 518 250 C570 251 610 223 650 235 L665 290 L357 290 Z' },
    'hat/cowboy': { behind: 'body', path: 'M323 214 L405 241 L375 242 L345 233 Z M610 241 L690 212 L663 232 L633 240 Z' },
    'hat/flowerCrown': { behind: 'body', path: 'M358 282 Q410 289 478 322 L478 350 L345 350 Z M665 281 Q613 290 546 322 L546 350 L680 350 Z' },
    'hat/horns': { behind: 'body', path: 'M338 203 Q383 219 425 195 L432 245 L330 245 Z M596 196 Q642 219 683 203 L690 245 L590 245 Z' },
    // Cups begin at source y455: the rear band must stop above their outline.
    'extra/headphones': { behind: 'hair', path: 'M0 0 H1024 V440 H0 Z' },
    'extra/earbuds': { behind: 'body', path: 'M480 413 Q497 410 497 432 Q497 448 480 445 Z M544 413 Q527 410 527 432 Q527 448 544 445 Z' },
  },
  // Measured source-space openings, separate from the decorative silhouette.
  hairOpenings: {
    bob: { left: 377, right: 698, y: 422, length: 235 },
    braids: { left: 371, right: 656, y: 454, length: 300 },
    bun: { left: 397, right: 634, y: 387, length: 120 },
    curls: { left: 389, right: 638, y: 411, length: 255 },
    pixie: { left: 362, right: 667, y: 396, length: 110 },
    waves: { left: 378, right: 653, y: 459, length: 300 },
    ponytail: { left: 285, right: 598, y: 449, length: 285, shell: [216, 707] },
  },
  hatOpenings: {
    backwardCap: { x: 503, y: 282, width: 397, depth: .53 },
    cap: { x: 532, y: 232, width: 308, depth: .48 },
    bucket: { x: 512, y: 240, width: 288, depth: .48 },
    chef: { x: 512, y: 244, width: 188, depth: .40 },
    sunhat: { x: 510, y: 272, width: 272, depth: .40, brim: { overhang: .23, drop: .13 } },
    beanie: { x: 512, y: 266, width: 242, depth: .44 },
    cowboy: { x: 510, y: 238, width: 242, depth: .43, brim: { overhang: .26, drop: .15 } },
    tophat: { x: 512, y: 245, width: 212, depth: .42 },
    fedora: { x: 512, y: 249, width: 250, depth: .43 },
    wizard: { x: 510, y: 244, width: 178, depth: .40 },
    crown: { x: 512, y: 222, width: 258, depth: .33 },
    hardhat: { x: 512, y: 247, width: 286, depth: .48 },
    viking: { x: 512, y: 223, width: 208, depth: .44 },
    party: { x: 512, y: 258, width: 200, depth: .18 },
    beret: { x: 542, y: 239, width: 252, depth: .42 },
    propeller: { x: 512, y: 253, width: 236, depth: .45 },
    santa: { x: 486, y: 226, width: 236, depth: .44 },
    headband: { x: 512, y: 535, width: 764, depth: .68 },
    horns: { x: 512, y: 197, width: 221, depth: .20 },
  },
  pivots: {
    body: [512, 922],
    hair: [512, 300],
    jewelry: [512, 480],
    cheeks: [512, 495],
    facialHair: [512, 560],
    mouth: [512, 560],
    eyes: [512, 437],
    brows: [512, 378],
    eyewear: [512, 437],
    neckwear: [512, 660],
    extra: [512, 350],
    'extra/headphones': [512, 330],
    'extra/earbuds': [512, 435],
    hat: [512, 300],
    item: [347, 620],
    gesture: [695, 630],
  },
  shapes: {
    classic: {},
    lumpy: { hat: { dy: 6 }, item: { dx: -6 }, gesture: { dx: 8 } },
    round: { hat: { scale: 1.1, dy: 2 }, extra: { scale: 1.14 }, item: { dx: -68 }, gesture: { dx: 70 }, neckwear: { scale: 1.08 } },
    long: { hat: { scale: 0.84, dy: 14 }, extra: { scale: 0.86 }, item: { dx: 78 }, gesture: { dx: -78 }, neckwear: { scale: 0.9 }, eyewear: { scale: 0.92 }, eyes: { scale: 0.92 }, brows: { scale: 0.92 } },
  },
  parts: {
    // November completion pack: fit the original artwork without distortion.
    'gesture/thumbsUp': {"scale":0.7266,"dx":27.35,"dy":-3.18},
    'gesture/thumbsUp@round': {"scale":0.84,"dx":-12,"dy":-6},
    'brows/raised': {"scale":1,"dx":0,"dy":-18},
    'brows/raised@long': { scale: 0.72, dy: 10 },
    'gesture/wave': {"scale":0.6481,"dx":38.98,"dy":14.44},
    'gesture/wave@round': {"scale":0.84,"dx":-12,"dy":-6},
    'gesture/peace': {"scale":0.7749,"dx":24.3,"dy":25.61},
    'gesture/peace@round': {"scale":0.84,"dx":-12,"dy":-6},
    'gesture/point': {"scale":0.7609,"dx":24.13,"dy":3.37},
    'gesture/point@round': {"scale":0.84,"dx":-12,"dy":-6},
    'gesture/rock': {"scale":0.6709,"dx":48.55,"dy":12.78},
    'gesture/rock@round': {"scale":0.84,"dx":-12,"dy":-6},
    'gesture/ok': {"scale":0.5738,"dx":49.43,"dy":9.92},
    'gesture/ok@round': {"scale":0.84,"dx":-12,"dy":-6},
    'gesture/fist': {"scale":0.7609,"dx":30.22,"dy":-8.8},
    'gesture/fist@round': {"scale":0.84,"dx":-12,"dy":-6},
    'gesture/rest': { scale: .85 },
    'gesture/salute': {"scale":0.83,"dx":20.79,"dy":-40.01},
    'gesture/salute@round': {"scale":0.84,"dx":-12,"dy":-6},
    'gesture/flex': {"scale":0.6604,"dx":46.04,"dy":14.15},
    'gesture/flex@round': {"scale":0.84,"dx":-12,"dy":-6},
    'item/none': { scale: .85 },
    'item/phone': {"scale":0.8,"dx":-128.2,"dy":12.8},
    'item/phone@round': {"scale":0.84,"dx":12,"dy":-6},
    'item/boba': {"scale":0.7955,"dx":-63.93,"dy":-4.09},
    'item/boba@round': {"scale":0.84,"dx":12,"dy":-6},
    'item/controller': {"scale":0.5773,"dx":-130.73,"dy":9.73},
    'item/controller@round': {"scale":0.84,"dx":12,"dy":-6},
    'item/sign': {"scale":0.7273,"dx":-81.73,"dy":-19.64},
    'item/sign@round': {"scale":0.84,"dx":12,"dy":-6},
    'item/pizza': {"scale":0.5634,"dx":-132.49,"dy":14.65},
    'item/pizza@round': {"scale":0.84,"dx":12,"dy":-6},
    'item/donut': {"scale":0.7629,"dx":-81.09,"dy":-7.41},
    'item/donut@round': {"scale":0.84,"dx":12,"dy":-6},
    'item/duck': {"scale":0.587,"dx":-140.86,"dy":9.06},
    'item/duck@round': {"scale":0.84,"dx":12,"dy":-6},
    'item/mic': {"scale":0.5668,"dx":-167.2,"dy":-22.83},
    'item/mic@round': {"scale":0.84,"dx":14,"dy":-6},
    'item/trophy': {"scale":0.6747,"dx":-116.18,"dy":-1.45},
    'item/trophy@round': {"scale":0.84,"dx":12,"dy":-6},
    'item/plant': {"scale":0.5501,"dx":-136.92,"dy":-4.32},
    'item/plant@round': {"scale":0.84,"dx":12,"dy":-6},
    // Tall hats sit lower on the big round head so their tips stay inside the canvas.
    'hat/tophat@round': { dy: 26 },
    'hat/wizard@round': { dy: 22 },
    'hat/chef@round': { dy: 20 },
    'hat/party@round': { dy: 16 },
    // Headphones were rendered head-sized; the potato is the head, so the cups go out to its sides.
    'extra/headphones': { scale: 1.8 },
    'extra/headphones@long': { scale: 0.7, dy: 34 },
    'extra/headphones@round': { scale: 1.1 },
    // Earbuds were rendered between the eyes; push each one out to the side of the body.
    'extra/earbuds': { spread: 215 },
    'extra/earbuds@long': { spread: -95 },
    'extra/earbuds@round': { spread: 70 },
    // Side-of-the-head extras follow the body's edge on narrow and wide shapes.
    'extra/earring@long': { dx: -42 },
    'extra/earring@round': { dx: 36 },
    'extra/flower@long': { dx: 72 },
    'extra/flower@round': { dx: -28 },
    'extra/bandaid@long': { dx: -10 },
  },
  recolor: {
    hat: ['backwardCap', 'cap', 'beanie', 'headband', 'bucket', 'cowboy', 'tophat', 'fedora', 'wizard', 'hardhat', 'party', 'beret', 'propeller', 'horns', 'santa', 'bow', 'sunhat'],
    neckwear: ['bowtie', 'tie', 'scarf', 'lanyard', 'bandana'],
    extra: ['headphones', 'scrunchie'],
    eyewear: ['catEye'],
    item: ['coffee'],
  },
  // First substantial crown row in each source image, excluding pompoms,
  // propellers, buttons and narrow tips. Open headwear intentionally has none.
  hatCrownY: {
    backwardCap: 56, cap: 58, beanie: 121, bucket: 51, cowboy: 97,
    tophat: 18, fedora: 49, wizard: 125, hardhat: 74, chef: 30,
    viking: 107, party: 122, beret: 84, propeller: 106, santa: 66, sunhat: 80,
  },
  // Corrections applied after silhouette fitting; edited by fit.html.
  surfaceNudges: { shapes: {}, parts: {} },
  // Reference palm spans calibrated against the visible hand silhouette. Props
  // and extended fingers are excluded; pose foreshortening is explicit below.
  palmWidth: {
    item: { laptop: 95, coffee: 75, wrench: 110, book: 110, none: 115,
      phone: 140, boba: 125, controller: 160, sign: 120, pizza: 155,
      donut: 140, duck: 220, mic: 160, trophy: 160, plant: 210,
      bouquet: 80, handbag: 90, teacup: 80, palette: 130 },
    gesture: { shaka: 135, thumbsUp: 140, wave: 180, peace: 145,
      point: 145, rock: 150, ok: 190, fist: 155, rest: 115,
      salute: 130, flex: 120, fingerHeart: 105, palmUp: 110, hip: 100 },
  },
  // These original arms were painted facing inward. Mirror about their real
  // shoulder, keeping the hand and prop together as one rigid image.
  surfaceRoots: {
    'gesture/shaka': { point: [706, 693], inset: 50 },
    'gesture/rest': { point: [735, 592] },
    'item/none': { point: [735, 592], flip: true },
    'item/coffee': { point: [57, 603], flip: true },
    // The replacement book is already held in the character's right hand.
    // Anchor its painted shoulder; mirroring would put the book into the torso.
    'item/book': { point: [370, 650], inset: 65 },
    'item/bouquet': { point: [363, 565], inset: 65 },
    'item/handbag': { point: [352, 550], inset: 65, dy: -30 },
    'item/teacup': { point: [355, 577], inset: 65 },
    'item/palette': { point: [355, 565], inset: 65 },
    'gesture/fingerHeart': { point: [700, 673], inset: 58 },
    'gesture/palmUp': { point: [683, 606], inset: 85, scale: 1.1 },
    'gesture/hip': { point: [690, 550], inset: 90, dy: -40, foreshorten: .85, rot: 10 },
  },
  // Prop silhouettes in the original 1024 px part canvas. Restore these after
  // skin tint so food, gold, wood and clay keep their rendered material colors.
  // Fingers crossing the torso must stay in front of it, even near the shoulder.
  skinFront: { 'gesture/shaka': [[[715, 520], [980, 520], [980, 655], [715, 655]]] },
  // Visible iris regions in source pixels; clipped where eyelids cover them.
  eyeIrises: {"smug":[{"cx":468,"cy":441,"rx":18.5,"ry":19,"visibleClip":{"minYAtCenter":435,"slope":-0.12}},{"cx":623,"cy":436,"rx":17.5,"ry":18,"visibleClip":{"minYAtCenter":429,"slope":-0.18}}],"wide":[{"cx":464,"cy":432,"rx":25,"ry":25},{"cx":559,"cy":432,"rx":25,"ry":25}],"wink":[{"cx":476,"cy":441,"rx":20,"ry":19,"visibleClip":{"minYAtCenter":422,"slope":0}}],"sleepy":[{"cx":464,"cy":443,"rx":17,"ry":17,"visibleClip":{"minYAtCenter":446,"slope":0}},{"cx":559,"cy":443,"rx":17,"ry":17,"visibleClip":{"minYAtCenter":446,"slope":0}}],"angry":[{"cx":448,"cy":435,"rx":20,"ry":20,"visibleClip":{"minYAtCenter":433,"slope":0.35}},{"cx":575,"cy":435,"rx":20,"ry":20,"visibleClip":{"minYAtCenter":433,"slope":-0.35}}],"surprised":[{"cx":472,"cy":432,"rx":8.5,"ry":8.5},{"cx":556,"cy":432.5,"rx":8.5,"ry":8.5}],"side":[{"cx":444,"cy":436,"rx":12.5,"ry":16,"visibleClip":{"minYAtCenter":422,"slope":0}},{"cx":534,"cy":440,"rx":14,"ry":16,"visibleClip":{"minYAtCenter":428,"slope":-0.25}}],"rolling":[{"cx":468,"cy":414,"rx":14,"ry":14,"visibleClip":{"minYAtCenter":416.5,"slope":0}},{"cx":559,"cy":414,"rx":14,"ry":14,"visibleClip":{"minYAtCenter":416.5,"slope":0}}],"heart":[{"cx":463,"cy":431,"rx":27.5,"ry":27.5},{"cx":562,"cy":431,"rx":27.5,"ry":27.5}],"stars":[{"cx":460,"cy":430,"rx":25,"ry":25},{"cx":563,"cy":430,"rx":25,"ry":25}],"almond":[{"cx":422,"cy":429,"rx":32,"ry":32,"visibleClip":{"minYAtCenter":406,"slope":0}},{"cx":600,"cy":429,"rx":32,"ry":32,"visibleClip":{"minYAtCenter":406,"slope":0}}],"lashWink":[{"cx":439,"cy":429,"rx":30,"ry":30,"visibleClip":{"minYAtCenter":410,"slope":0}}]},
  skinProtect: {
    // Trace the keyboard and finger scallops closely: a broad envelope leaves
    // russet skin behind the hinge and across the supporting fingertips.
    'item/laptop': [[[15,500],[205,510],[223,640],[300,651],[300,657],[226,673],[220,674],[172,667],[168,663],[164,660],[158,658],[153,659],[148,661],[143,661],[139,656],[135,654],[130,653],[125,653],[120,655],[116,657],[112,653],[108,651],[103,650],[99,651],[95,653],[92,657],[89,658],[45,654]]],
    'item/phone': [[[157,448],[290,448],[290,554],[284,559],[279,566],[276,575],[275,586],[276,596],[279,606],[283,616],[287,622],[287,665],[285,672],[280,679],[274,684],[266,687],[255,688],[194,688],[199,682],[198,675],[194,669],[188,665],[192,662],[195,656],[196,650],[193,643],[189,637],[182,634],[188,631],[192,626],[193,620],[191,613],[187,607],[181,602],[174,600],[180,595],[183,588],[183,581],[180,574],[175,568],[170,564],[166,562],[157,562]]],
    'item/controller': [[[55,495],[280,495],[280,504],[300,513],[320,536],[335,582],[345,646],[349,659],[342,674],[334,681],[325,686],[317,686],[308,681],[300,673],[291,660],[284,647],[282,629],[126,629],[115,649],[102,667],[80,705],[55,705]]],
    'item/mic': [
      [[130,405],[273,405],[273,540],[245,540],[237,611],[215,610],[201,616],[197,633],[164,622],[160,540],[130,540]],
      [[216,658],[230,658],[228,782],[223,810],[167,816],[162,786],[188,786],[207,779],[214,765],[211,754],[217,741],[218,722],[211,714],[218,704],[218,688],[210,678],[214,666]],
    ],
    'item/palette': [
      [[65,578],[223,578],[224,626],[224,632],[214,634],[208,632],[203,629],[198,629],[194,630],[191,632],[189,636],[190,641],[193,645],[199,649],[208,653],[218,658],[219,670],[215,676],[208,681],[199,684],[191,690],[189,684],[186,680],[183,678],[180,678],[177,681],[175,684],[174,684],[173,680],[170,676],[167,673],[164,672],[161,673],[158,675],[155,679],[153,680],[151,678],[148,675],[144,674],[140,675],[137,678],[135,682],[125,682],[110,677],[96,671],[65,650]],
      // The brush crosses the thumb independently of the palette's cutout.
      [[188,645],[224,666],[227,668],[226,671],[222,670],[188,651]],
    ],
    'item/bouquet': [
      [[50,420],[280,420],[280,600],[196,600],[190,608],[176,611],[161,611],[149,620],[127,624],[116,617],[112,609],[127,598],[50,600]],
      // The long red tail and every exposed stem keep their own material.
      // The stem's left contour follows the three gripping fingertips.
      [[150,610],[156,609],[151,617],[146,624],[140,633],[134,644],[128,658],[124,661],[121,651],[118,643],[125,632],[134,620],[144,613]],
      [[151,609],[173,610],[169,612],[165,615],[162,618],[161.5,622],[162.5,626],[159,627],[153,626],[150,625],[148,620],[151,613]],
      [[171.5,633],[181,633],[186,644],[190,655],[196,667],[202,679],[207,688],[212,696],[214,706],[203,714],[175,720],[161,716],[156,700],[158,685],[164,685],[170.5,682],[177.5,679],[181.5,676],[183.5,673],[183.5,670],[183,666],[181.5,663],[180.5,659],[181.5,654],[181,651],[180,648],[175.5,645],[174,642],[173.5,639],[172.5,636]],
    ],
    'item/handbag': [
      [[65,690],[265,690],[265,840],[65,840]],
      [[126,696],[130,663],[143,648],[147,663],[139,699]],
      [[199,655],[212,665],[227,700],[215,706],[207,679]],
    ],
    'item/teacup': [
      // Porcelain and the two visible handle arcs; the finger in the opening
      // is skin, including its inner edge at source (178, 643).
      [[65,608],[176,608],[177,632],[167,653],[159,677],[153,687],[153,704],[65,704]],
      [[169,633],[177,630],[183,630],[187,633],[191,636],[194,640],[196,643],[190,640],[185,638],[180,639],[177,643],[175,648],[175,653],[171,653],[169,647]],
      [[153,672],[171,662],[178,658],[184,659],[187,661],[183,664],[178,667],[173,670],[166,674],[154,682],[148,681],[148,678]],
    ],
    'mouth/grin': [[[429,542],[440,544],[455,548],[468,552],[480,554],[500,556],[512,558],[530,556],[550,554],[565,551],[575,548],[590,542],[596,538],[590,552],[578,569],[562,582],[542,590],[520,594],[499,593],[479,588],[460,577],[445,562]]],
    'mouth/laugh': [[[446,541],[459,542],[480,542],[500,544],[513,544],[530,542],[551,541],[569,540],[578,540],[574,553],[568,570],[557,584],[545,594],[530,600],[513,602],[496,600],[481,595],[469,585],[457,571],[449,553]]],
    'mouth/tongue': [[[439,541],[450,545],[464,549],[484,551],[512,552],[541,550],[563,547],[578,541],[585,539],[580,551],[573,565],[570,575],[576,582],[579,591],[578,601],[573,609],[564,615],[553,616],[541,612],[528,605],[516,598],[506,588],[488,587],[476,586],[463,579],[452,567],[444,552]]],
    'mouth/grit': [[[434,578],[440,561],[451,550],[459,548],[470,552],[485,556],[503,560],[513,560],[528,557],[544,552],[558,550],[569,552],[581,561],[589,573],[592,579],[587,586],[577,592],[560,595],[535,596],[511,595],[485,595],[460,594],[445,588],[436,582]]],
    'mouth/oh': [[[512,566],[519,568],[524,573],[527,580],[524,587],[519,591],[512,592],[505,590],[500,585],[498,579],[500,573],[505,568]]],
    'mouth/whistle': [[[597, 514], [639, 514], [639, 591], [597, 591]]],
    'item/wrench': [
      [[24,426],[136,426],[155,558],[144,571],[108,571],[100,552],[24,526]],
      [[163,591],[224,691],[224,725],[181,727],[152,672],[168,652],[173,633],[169,611]],
    ],
    // Keep the two exposed ceramic handle arcs distinct from the fingers
    // inside the opening; the cup rectangle alone omitted both arcs.
    'item/coffee': [
      [[218,495],[330,495],[330,735],[218,735]],
      [[211,618],[230,618],[230,635],[215,635],[215,632],[211,632],[211,634],[193,634],[190,633],[189,630],[194,627],[200,624],[207,621],[210,619]],
      [[208,689],[214,689],[218,685],[231,685],[231,709],[218,709],[211,707],[205,704],[200,702],[197,699],[195,695],[195,693],[199,692],[203,690],[206,690]],
    ],
    // Follow the four supporting fingertips so the cream pages and navy
    // cover retain their colors while the complete palm follows body skin.
    'item/book': [[[282.5,522.0],[284.5,522.0],[287.5,526.0],[292.5,528.0],[303.5,539.0],[311.5,538.0],[314.0,540.5],[315.0,544.5],[309.0,568.5],[305.0,579.5],[301.0,598.5],[299.0,601.5],[296.0,615.5],[292.0,626.5],[292.0,630.5],[290.0,633.5],[289.0,640.5],[284.0,655.5],[284.0,660.5],[279.0,675.5],[279.0,678.5],[276.0,687.5],[270.5,693.0],[211.5,725.0],[209.0,724.5],[208.5,715.0],[207.0,716.5],[207.0,723.5],[202.5,730.0],[198.5,729.0],[189.5,730.0],[182.0,724.5],[181.0,721.5],[175.0,714.5],[173.5,708.0],[171.5,712.0],[165.5,712.0],[163.0,707.5],[159.0,704.5],[157.0,699.5],[152.5,695.0],[148.5,693.0],[140.5,693.0],[139.0,691.5],[140.0,688.5],[127.5,677.0],[119.5,676.0],[114.5,678.0],[113.0,674.5],[109.5,671.0],[102.5,668.0],[96.5,669.0],[90.0,674.5],[87.0,681.5],[86.0,688.5],[85.0,688.5],[82.0,679.5],[82.0,675.5],[77.0,655.5],[76.0,644.5],[72.0,628.5],[71.0,616.5],[69.0,610.5],[69.0,605.5],[68.0,604.5],[65.0,583.5],[63.0,577.5],[63.0,572.5],[59.0,555.5],[59.0,551.5],[62.5,547.0],[64.5,546.0],[72.5,547.0],[76.5,543.0],[80.5,541.0],[83.5,537.0],[85.5,537.0],[88.5,533.0],[92.5,531.0],[93.5,528.0],[96.5,528.0],[98.5,526.0],[140.5,542.0],[164.5,554.0],[177.5,563.0],[188.0,573.5],[193.0,579.5],[194.0,582.5],[195.5,584.0],[196.5,583.0],[197.5,585.0],[198.0,582.5],[208.0,568.5],[225.5,552.0],[246.5,539.0],[282.5,522.0]]],
    'item/boba': [
      [[70,330],[260,330],[260,500],[239,500],[219,596],[194,697],[177,705],[116,705],[116,694],[125,684],[126,670],[117,660],[125,649],[126,637],[117,627],[121,614],[118,599],[95,581],[85,499],[70,485]],
    ],
    // Follow the pole down to the thumb; the exposed wood ends at y634.
    'item/sign': [
      [[50,365],[345,365],[345,590],[208,590],[208,633.5],[203,634],[195,634],[187,634],[180,634],[178,633],[178,628],[171,628],[171,590],[50,590]],
      [[176,740],[210,740],[210,813],[176,813]],
    ],
    'item/pizza': [
      [[50,390],[365,390],[365,553],[331,577],[318,568],[308,560],[299,557],[291,558],[285,562],[282,568],[281,575],[283,584],[288,594],[298,603],[290,608],[277,616],[263,624],[248,633],[225,644],[200,654],[50,654]],
    ],
    // Two traced halves protect the donut ring while leaving the finger
    // inside its hole, the opposing thumb and underside support tintable.
    'item/donut': [
      [[55,390],[176,390],[176,495],[168,496],[162,499],[157,502],[153,506],[149,511],[147,516],[146.5,523],[147.5,529],[149,534],[151.5,539],[155,544],[159,549],[164,552.5],[170,554.5],[176,554.5],[176,635.5],[161,633.5],[148,629.5],[136,625],[124,620],[113,614],[102,606],[93,596],[86,584],[55,584]],
      [[176,390],[305,390],[305,590],[267,591],[261,586],[254,581],[247,577],[239,572],[231,568],[224,565],[217,565],[211,568],[206,572],[202,578],[200,584],[200,592],[202,601],[205,607],[210,613],[216,618],[223,622],[227,625],[221,629],[212,632.5],[200,635],[188,636],[176,635.5],[176,554.5],[178,554.5],[185,552.5],[190,549.5],[195,545.5],[198.5,541],[201,537],[203,533],[204,527],[204,520],[202,514],[199,509],[195,504],[190,500],[184,497],[176,495]],
    ],
    'item/duck': [
      [[95,452],[320,452],[320,610],[311,611],[301,606],[291,599],[280,597],[272,600],[268,607],[268,617],[270,627],[276,636],[280,643],[279,650],[274,657],[265,662],[252,666],[234,670],[211,674],[189,673],[178,669],[177,656],[174,648],[170,643],[164,639],[158,637],[152,637],[146,640],[141,645],[140,641],[137,632],[132,625],[126,621],[118,619],[111,620],[109,622],[110,614],[108,606],[108,598],[95,598]],
    ],
    // Leave the small upper index fingertip outside the gold-cup mask.
    'item/trophy': [
      [[65,365],[385,365],[385,596],[168,596],[164,594],[160,592],[154,591],[146,591],[138,593],[133,596],[65,596]],
    ],
    'item/plant': [
      [[50,400],[345,400],[345,600],[303,614],[294,618],[287,620],[281,624],[277,631],[275,639],[275,650],[277,664],[274,682],[270,696],[264,707],[256,718],[247,726],[236,733],[225,737],[216,739],[212,734],[210,727],[206,720],[200,715],[193,711],[187,711],[181,714],[175,719],[171,725],[169,731],[166,719],[160,710],[153,704],[145,702],[138,704],[132,709],[127,719],[123,712],[118,706],[112,701],[106,699],[104,696],[103,690],[101,682],[100,677],[85,666],[76,615],[50,615]],
    ],
  },
  // The manifest draws extras under the hat. For these hats headphones go over the hat instead,
  // band across the cap like a gamer; everything else keeps the band tucked under the brim.
  headphonesOver: ['backwardCap', 'cap', 'beanie', 'headband', 'halo'],
  capText: {
    backwardCap: { x: 435, y: 119, w: 102, h: 36, rot: -7, color: '#F7EBD7' },
    cap: { x: 512, y: 148, w: 190, h: 66, rot: 0, color: '#F7EBD7' },
    beanie: { x: 512, y: 226, w: 170, h: 54, rot: 0, color: '#F7EBD7' },
    headband: { x: 512, y: 448, w: 360, h: 70, rot: 0, color: '#F7EBD7' },
  },
  laptop: { lid: [[26, 514], [197, 523], [224, 668], [50, 652]] },
  sign: { x: 65, y: 390, w: 258, h: 180, fontSize: 58, color: '#173D40' },
};
