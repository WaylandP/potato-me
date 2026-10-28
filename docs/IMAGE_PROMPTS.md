# Image prompts for the rendered potato parts

These prompts produce the art for a layered PNG version of potato-me: ChatGPT
renders every part as its own 1024 × 1024 transparent PNG, drawn as if it were
sitting on one shared base potato, and the app stacks the layers.

How to use this file:

1. Open a new ChatGPT chat with image generation. **Attach the reference potato
   image** (the one with the backward cap, laptop and shaka), then paste the
   **Master prompt**. It makes the base potato.
2. Keep going in the **same chat**, one part per message, pasting the line for
   each part from the manifest below after the words `Part request:`. The chat
   keeps the style and scale consistent. If it drifts, re-attach the base
   potato image it made and say "use this as the base again".
3. Save each image with the exact file name in the manifest, under
   `assets/parts/<group>/<key>.png`. Names are the keys the app already uses,
   so a share link like `#hat=wizard` picks `assets/parts/hat/wizard.png`.
4. Start with the **Start here** set (about 40 images). Everything else is
   additive: a missing file simply hides that option.

Tips that matter:

- Always say "transparent background" and "render only the part, not the
  potato". If it draws the potato anyway, reply "remove the potato, keep only
  the hat" and it will edit the image.
- Ask for one part per image. Sprite sheets cannot be cut apart cleanly.
- Hats, neckwear, headphones and the mug are generated in **pure red**. The app
  recolors them to the twelve hat colors at runtime, so you do not need one
  image per color. Crowns, halos, chains and trophies stay gold.
- Keep the sign and the laptop lid blank. The app writes your sign text and
  stamps the stickers on at runtime.

---

## Master prompt (first message, with the reference image attached)

```text
You are the character artist for "potato-me", an avatar builder. Match the attached reference image's look exactly: a Pixar-style 3D rendered cartoon potato, photoreal potato skin (warm russet tan, fine netted texture, mottled darker blotches, small dimple "eyes", two or three tiny pale sprouts), soft specular sheen, one soft key light from the upper left with a gentle fill from the right, soft shadows, no outlines, no text, no watermark, no brand logos.

I will ask you for many separate images. Rules for EVERY image unless I say otherwise:
1. 1024 x 1024 PNG with a fully transparent background. No backdrop, no floor, no gradient, no vignette.
2. Straight-on front view at eye level, same camera and distance every time. The potato is centered and spans from about 15% to 90% of the image height, feet at the bottom. Eye line at about 42% of the image height, mouth at about 56%, hat brim at about 22%, arms leave the body at about 60%.
3. Same lighting every time: key light upper left, fill right.
4. When I ask for a PART, render ONLY that part, isolated, at exactly the position, scale, perspective and lighting it would have on the base potato, as if the potato were there but invisible. Do not draw the potato, its shadow, or anything else with it.
5. One part per image. No variations, no grids, no sprite sheets, no labels.
6. Original designs only: no logos, mascots or characters from any brand.
7. Colorway rule: hats, caps, beanies, headbands, neckwear, headphones and the coffee mug are rendered in pure saturated red (#C8372D) with natural shading, because the app recolors them. Crowns, halos, chains, buckles and trophies are gold.

First image, the BASE POTATO: a classic egg-shaped russet potato body, slightly wider at the bottom, with the skin described above, two short stubby legs with rounded feet, standing, with a soft contact shadow directly under the feet. NO face: no eyes, no eyebrows, no mouth, no arms, no hat. Transparent background. Every later part is positioned relative to this base, so keep this exact framing for all of them.
```

After it replies, download the base and save it as `assets/parts/body/classic-russet.png`.

---

## Part requests

Paste one line per message, after `Part request:`. Every line already includes
the isolation rules, so you only need to paste it.

Format used below: **file name** then the prompt line.

### Bodies, group `body` (blank face, legs and feet, floor shadow included)

Start here: `classic-russet` (the base). Then the other shapes in russet, then
skins. The skins are optional: the app can tint the russet base at runtime,
but generated skins look better.

- `body/classic-russet.png` (the base, from the master prompt)
- `body/lumpy-russet.png` — Full body like the base potato but a LUMPY shape: knobbly, with two or three soft bumps on the sides and top. Same skin, same legs and feet, same framing, no face, no arms, transparent background.
- `body/round-russet.png` — Full body like the base potato but a nearly spherical ROUND shape. Same skin, legs, feet, framing, no face, no arms, transparent background.
- `body/long-russet.png` — Full body like the base potato but a tall LONG oval, fingerling-like. Same skin, legs, feet, framing, no face, no arms, transparent background.

Then for each shape, the skins. Replace SHAPE with classic, lumpy, round or long:

- `body/SHAPE-gold.png` — The SHAPE body again with Yukon gold skin: smooth thin yellow-gold skin, lighter and shinier than russet, few blotches.
- `body/SHAPE-red.png` — The SHAPE body again with red potato skin: rosy red-brown, smooth with a few pale dimples.
- `body/SHAPE-purple.png` — The SHAPE body again with purple potato skin: deep violet, slightly glossy.
- `body/SHAPE-sweet.png` — The SHAPE body again as a sweet potato: orange-copper skin with fine lengthwise streaks.
- `body/SHAPE-blue.png` — The SHAPE body again with Adirondack blue skin: dusty blue-violet with darker speckles.
- `body/SHAPE-pink.png` — The SHAPE body again with pink fingerling skin: pale pink with soft blush patches.
- `body/SHAPE-ghost.png` — The SHAPE body again with pale cream-white skin, faint dimples, very light blotches.
- `body/SHAPE-zombie.png` — The SHAPE body again with a sickly green-grey zombie skin, darker mottled patches, a couple of small cracks.

### Eyes, group `eyes` (render only the two eyes, at the eye line)

Start here: smug, dots, happy, wide, wink, sleepy.

- `eyes/smug.png` — Only the eyes: half-lidded, confident, glancing slightly to the viewer's right, warm brown irises, glossy highlights.
- `eyes/dots.png` — Only the eyes: small round black bead eyes with a bright highlight each.
- `eyes/happy.png` — Only the eyes: closed, as two upward arcs, cheerful.
- `eyes/wide.png` — Only the eyes: big round eyes with white sclera, brown irises, excited.
- `eyes/wink.png` — Only the eyes: the viewer's-left eye open and glossy, the right eye closed in a wink.
- `eyes/sleepy.png` — Only the eyes: heavy drooping lids, barely open, drowsy.
- `eyes/angry.png` — Only the eyes: narrowed, glaring, brown irises.
- `eyes/surprised.png` — Only the eyes: wide open with small pupils, startled.
- `eyes/side.png` — Only the eyes: a sideways glance to the viewer's left, slightly shy.
- `eyes/squint.png` — Only the eyes: tight laughing squint, both eyes nearly shut.
- `eyes/rolling.png` — Only the eyes: rolled up toward the top lids, exasperated.
- `eyes/heart.png` — Only the eyes: open eyes with glossy red heart-shaped pupils.
- `eyes/stars.png` — Only the eyes: open eyes with sparkling gold star-shaped pupils.
- `eyes/dead.png` — Only the eyes: cartoon "X X" eyes, two dark crosses.

### Eyebrows, group `brows` (render only the two eyebrows, just above the eye line)

Start here: smug, thick, angry, raised.

- `brows/smug.png` — Only the eyebrows: thick dark brown brows, the viewer's-right one raised high, the left one lowered, like the reference.
- `brows/thick.png` — Only the eyebrows: thick dark brown brows, both gently arched, relaxed.
- `brows/angry.png` — Only the eyebrows: thick brows slanted down toward the center.
- `brows/worried.png` — Only the eyebrows: thick brows slanted up toward the center, anxious.
- `brows/raised.png` — Only the eyebrows: both thick brows arched high, surprised or excited.
- `brows/flat.png` — Only the eyebrows: thick, straight and low, unimpressed.
- `brows/uni.png` — Only the eyebrows: one thick continuous unibrow across both eyes.

### Mouths, group `mouth` (render only the mouth)

Start here: smirk, grin, laugh, smile, flat, oh.

- `mouth/smirk.png` — Only the mouth: a confident one-sided smirk, lips closed, like the reference.
- `mouth/grin.png` — Only the mouth: a wide grin showing a row of white teeth.
- `mouth/laugh.png` — Only the mouth: open laughing mouth, tongue and upper teeth visible.
- `mouth/smile.png` — Only the mouth: a gentle closed smile.
- `mouth/flat.png` — Only the mouth: a straight, flat, unimpressed line.
- `mouth/frown.png` — Only the mouth: a sad downturned frown.
- `mouth/oh.png` — Only the mouth: a small round open "oh".
- `mouth/tongue.png` — Only the mouth: a playful smile with the tongue sticking out to one side.
- `mouth/grit.png` — Only the mouth: gritted teeth, a tense wide clench.
- `mouth/whistle.png` — Only the mouth: puckered whistling lips, with two tiny music notes floating beside it.
- `mouth/kiss.png` — Only the mouth: puckered kissing lips.
- `mouth/wavy.png` — Only the mouth: a nervous wavy squiggle mouth.

### Cheeks, group `cheeks` (render only the cheek marks)

- `cheeks/on.png` — Only the cheeks: two soft rosy blush ovals, one on each cheek, slightly below the eye line.
- `cheeks/freckles.png` — Only the cheeks: a light scatter of small darker freckles across both cheeks and the bridge between the eyes.

### Facial hair, group `facialHair` (render only the hair, below the mouth position)

- `facialHair/mustache.png` — Only the facial hair: a classic thick dark-brown mustache above the mouth position.
- `facialHair/handlebar.png` — Only the facial hair: a dark-brown handlebar mustache with curled waxed tips.
- `facialHair/goatee.png` — Only the facial hair: a neat dark-brown goatee under the mouth position.
- `facialHair/beard.png` — Only the facial hair: a full dark-brown beard wrapping the lower face, mouth area left open.
- `facialHair/stubble.png` — Only the facial hair: light dark stubble shading across the chin and jaw area.

### Hats, group `hat` (render only the hat, sitting on the head, pure red unless noted)

Start here: backwardCap, cap, beanie, wizard, crown, party, cowboy, tophat.

- `hat/backwardCap.png` — Only the hat: a backward baseball cap in pure red with a subtle woven fabric texture, the adjustable strap and clasp facing the viewer, a button on top, seams, the brim pointing back-right.
- `hat/cap.png` — Only the hat: a forward-facing baseball cap in pure red, curved brim toward the viewer, button on top, seams.
- `hat/beanie.png` — Only the hat: a pure red knit beanie with a folded ribbed cuff and a cream pom-pom.
- `hat/headband.png` — Only the hat: a pure red terry sweatband around the top of the head.
- `hat/bucket.png` — Only the hat: a pure red canvas bucket hat with a soft downward brim and stitched rows.
- `hat/cowboy.png` — Only the hat: a pure red felt cowboy hat with a wide curved brim, pinched crown and a thin dark band.
- `hat/tophat.png` — Only the hat: a tall pure red silk top hat with a dark band and a slight sheen.
- `hat/fedora.png` — Only the hat: a pure red felt fedora with a pinched crown and a dark ribbon band.
- `hat/wizard.png` — Only the hat: a tall pure red wizard hat with a floppy bent tip, wide brim, a dark band with a gold buckle, and a few small gold stars and a crescent moon on it.
- `hat/crown.png` — Only the hat: a gold royal crown with five points, red velvet inside, and jewels: one ruby in front, two sapphires.
- `hat/hardhat.png` — Only the hat: a pure red construction hard hat with a center ridge and a wide front brim.
- `hat/chef.png` — Only the hat: a tall white pleated chef's toque.
- `hat/viking.png` — Only the hat: a brushed steel viking helmet with a nose guard and two curved ivory horns.
- `hat/party.png` — Only the hat: a pure red cone party hat with white diagonal stripes and a white pom-pom on the tip, slightly tilted.
- `hat/beret.png` — Only the hat: a pure red wool beret tilted to one side with a little stem on top.
- `hat/propeller.png` — Only the hat: a pure red beanie cap with a small spinning propeller on top.
- `hat/halo.png` — Only the hat: a glowing gold halo floating just above the head.
- `hat/horns.png` — Only the hat: two small pure red devil horns on the top of the head.
- `hat/santa.png` — Only the hat: a pure red Santa hat with white fur trim and a white pom-pom hanging to one side.

### Eyewear, group `eyewear` (render only the eyewear, at the eye line)

Start here: shades, round.

- `eyewear/shades.png` — Only the eyewear: black wayfarer-style sunglasses with dark glossy lenses and a subtle reflection.
- `eyewear/aviators.png` — Only the eyewear: gold-rimmed aviator sunglasses with dark gradient lenses.
- `eyewear/round.png` — Only the eyewear: round thin-wire glasses with clear lenses and a soft glint.
- `eyewear/square.png` — Only the eyewear: black rectangular-framed glasses with clear lenses.
- `eyewear/monocle.png` — Only the eyewear: a gold-rimmed monocle over the viewer's-right eye with a thin chain hanging down.
- `eyewear/eyepatch.png` — Only the eyewear: a black eye patch over the viewer's-left eye with a thin strap around the head.

### Neckwear, group `neckwear` (render only the item, at the base of the body, below the mouth)

Start here: bowtie, tie.

- `neckwear/bowtie.png` — Only the neckwear: a pure red satin bow tie.
- `neckwear/tie.png` — Only the neckwear: a pure red necktie with a small knot, hanging down the front.
- `neckwear/scarf.png` — Only the neckwear: a chunky pure red knit scarf wrapped once with the ends hanging to one side.
- `neckwear/chain.png` — Only the neckwear: a chunky gold chain necklace.
- `neckwear/lanyard.png` — Only the neckwear: a pure red conference lanyard with a blank white badge hanging on the chest.
- `neckwear/bandana.png` — Only the neckwear: a pure red paisley bandana knotted at the front.

### Extras, group `extra` (render only the item)

Start here: headphones.

- `extra/headphones.png` — Only the item: pure red over-ear headphones with a padded band over the top of the head and cups on both sides.
- `extra/earbuds.png` — Only the item: small white wireless earbuds, one on each side of the head.
- `extra/bandaid.png` — Only the item: one beige adhesive bandage on the viewer's-right cheek.
- `extra/earring.png` — Only the item: a single gold hoop earring on the viewer's-right side of the head.
- `extra/flower.png` — Only the item: a small pink daisy tucked at the upper left of the head.

### Held items, group `item` (render the LEFT arm, hand AND the item, nothing else)

These include the arm so the grip looks right. The arm leaves the body on the
viewer's left side at about 60% of the image height. Arms are the same
russet potato skin as the base.

Start here: laptop, coffee, sign, phone, none.

- `item/laptop.png` — Only the viewer's-left arm, hand and item: the arm holds an open laptop from below on its palm, lid facing the viewer, tilted slightly, matte dark-gray lid with NO stickers or logos (stickers are added later), keyboard edge visible.
- `item/coffee.png` — Only the viewer's-left arm, hand and item: the hand holds a pure red ceramic mug of steaming coffee by the handle.
- `item/boba.png` — Only the viewer's-left arm, hand and item: the hand holds a clear plastic boba tea cup with milk tea, black tapioca pearls and a wide straw.
- `item/phone.png` — Only the viewer's-left arm, hand and item: the hand holds up a modern smartphone, screen toward the viewer, dark blank screen.
- `item/controller.png` — Only the viewer's-left arm, hand and item: the hand holds a dark game controller with colored buttons.
- `item/sign.png` — Only the viewer's-left arm, hand and item: the hand holds a wooden stick with a blank white rectangular sign board on top, board facing the viewer, nothing written on it.
- `item/pizza.png` — Only the viewer's-left arm, hand and item: the hand holds a slice of pepperoni pizza with a stretchy cheese pull.
- `item/donut.png` — Only the viewer's-left arm, hand and item: the hand holds a pink-frosted donut with rainbow sprinkles, one bite taken.
- `item/duck.png` — Only the viewer's-left arm, hand and item: the hand holds a classic yellow rubber duck.
- `item/wrench.png` — Only the viewer's-left arm, hand and item: the hand holds a big red adjustable wrench.
- `item/book.png` — Only the viewer's-left arm, hand and item: the hand holds an open hardcover book with a dark blue cover.
- `item/mic.png` — Only the viewer's-left arm, hand and item: the hand holds a silver handheld stage microphone.
- `item/trophy.png` — Only the viewer's-left arm, hand and item: the hand holds up a shiny gold trophy cup with handles.
- `item/plant.png` — Only the viewer's-left arm, hand and item: the hand holds a small terracotta pot with a green succulent.
- `item/none.png` — Only the viewer's-left arm and hand: the arm resting relaxed at the side, hand open, holding nothing.

### Free hand, group `gesture` (render the RIGHT arm and hand only)

The arm leaves the body on the viewer's right side at about 60% of the image
height. Same russet skin as the base.

Start here: shaka, wave, thumbsUp, rest, peace.

- `gesture/rest.png` — Only the viewer's-right arm and hand: resting relaxed at the side, hand open.
- `gesture/wave.png` — Only the viewer's-right arm and hand: raised beside the head, open palm waving.
- `gesture/shaka.png` — Only the viewer's-right arm and hand: raised, making a shaka "hang loose" sign, thumb and pinky out, like the reference.
- `gesture/thumbsUp.png` — Only the viewer's-right arm and hand: a big thumbs up.
- `gesture/peace.png` — Only the viewer's-right arm and hand: a peace sign with two fingers up.
- `gesture/point.png` — Only the viewer's-right arm and hand: pointing straight at the viewer.
- `gesture/rock.png` — Only the viewer's-right arm and hand: the rock-on horns sign, index and pinky up.
- `gesture/ok.png` — Only the viewer's-right arm and hand: the OK sign, thumb and index in a circle.
- `gesture/fist.png` — Only the viewer's-right arm and hand: a fist raised in the air.
- `gesture/salute.png` — Only the viewer's-right arm and hand: a crisp salute with the hand at the brow.
- `gesture/flex.png` — Only the viewer's-right arm and hand: a cartoon bicep flex, arm bent, fist up.

### Backgrounds

No images needed. The app keeps drawing its own colors and patterns behind the
layers, including the studio spotlight and floor.

---

## Image count

| Set | Images |
| --- | --- |
| Start here | 41 |
| Everything, 4 body shapes in russet only | 111 |
| Everything, all 36 body skins | 143 |

## What the app does with them

- Stacks the layers in this order: background, body, cheeks, facial hair, mouth, eyes, eyebrows, eyewear, neckwear, extras, hat, held item, free hand.
- Reads per-part offsets from `assets/manifest.json`; a small fitting page lets you nudge any part with the arrow keys and save the offsets.
- Recolors the red colorway parts to the chosen hat color, stamps the chosen stickers on the laptop lid, and writes the sign text.
- Exports the stack as a 512 × 512 PNG, exactly as today.
