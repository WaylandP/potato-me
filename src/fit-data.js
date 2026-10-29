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
  sign: null,
};
