// Fitting data for the rendered PNG parts. Edit with fit.html (it prints this
// file) or by hand. All coordinates are on the 1024 px part canvas.
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
  pivots: {
    body: [512, 922],
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
    'gesture/rest': {"scale":0.65,"dx":3.55,"dy":-4.35},
    'gesture/salute': {"scale":0.83,"dx":20.79,"dy":-40.01},
    'gesture/salute@round': {"scale":0.84,"dx":-12,"dy":-6},
    'gesture/flex': {"scale":0.6604,"dx":46.04,"dy":14.15},
    'gesture/flex@round': {"scale":0.84,"dx":-12,"dy":-6},
    'item/none': {"scale":0.65,"dx":-43.95,"dy":11.5},
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
    hat: ['backwardCap', 'cap', 'beanie', 'headband', 'bucket', 'cowboy', 'tophat', 'fedora', 'wizard', 'hardhat', 'party', 'beret', 'propeller', 'horns', 'santa'],
    neckwear: ['bowtie', 'tie', 'scarf', 'lanyard', 'bandana'],
    extra: ['headphones'],
    item: ['coffee'],
  },
  // Parts whose tan areas are skin and should follow the body color: arms and hands fully,
  // eyes and mouths only in their light tones (lids, lips) so irises and tongues keep their color.
  skinTint: { item: 'full', gesture: 'full', eyes: 'light', mouth: 'light', cheeks: 'light' },
  noSkinTint: [],
  // Prop silhouettes in the original 1024 px part canvas. Restore these after
  // skin tint so food, gold, wood and clay keep their rendered material colors.
  skinProtect: {
    'item/boba': [
      [[74,330],[260,330],[260,596],[236,611],[236,662],[205,705],[117,705],[117,692],[128,672],[122,651],[129,635],[122,614],[128,594],[120,582],[120,465],[74,465]],
    ],
    'item/sign': [
      [[50,365],[345,365],[345,590],[206,590],[206,628],[171,628],[171,590],[50,590]],
      [[176,740],[210,740],[210,813],[176,813]],
    ],
    'item/pizza': [
      [[50,390],[365,390],[365,553],[318,569],[296,555],[282,565],[290,587],[302,604],[283,635],[182,652],[50,652]],
    ],
    'item/donut': [
      [[60,400],[300,400],[300,632],[222,632],[209,607],[192,590],[171,584],[153,598],[132,589],[112,590],[100,576],[66,576]],
    ],
    'item/duck': [
      [[95,452],[320,452],[320,591],[297,597],[286,620],[283,651],[270,674],[225,679],[211,660],[199,643],[180,644],[170,628],[151,623],[131,617],[121,600],[95,600]],
    ],
    'item/trophy': [ [[65,365],[385,365],[385,596],[65,596]] ],
    'item/plant': [
      [[50,400],[345,400],[345,600],[303,613],[281,624],[280,664],[275,705],[263,735],[227,747],[212,719],[196,714],[182,723],[171,710],[153,709],[140,719],[129,700],[111,696],[99,676],[85,666],[76,615],[50,615]],
    ],
  },
  // The manifest draws extras under the hat. For these hats headphones go over the hat instead,
  // band across the cap like a gamer; everything else keeps the band tucked under the brim.
  headphonesOver: ['backwardCap', 'cap', 'beanie', 'headband', 'halo'],
  capText: {
    backwardCap: { x: 468, y: 120, w: 118, h: 42, rot: -3, color: '#F7EBD7' },
    cap: { x: 512, y: 148, w: 190, h: 66, rot: 0, color: '#F7EBD7' },
    beanie: { x: 512, y: 226, w: 170, h: 54, rot: 0, color: '#F7EBD7' },
    headband: { x: 512, y: 226, w: 150, h: 36, rot: 0, color: '#F7EBD7' },
  },
  laptop: { lid: [[26, 514], [197, 523], [224, 668], [50, 652]] },
  sign: { x: 65, y: 390, w: 258, h: 180, fontSize: 58, color: '#173D40' },
};
