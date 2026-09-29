# Shinkzuku — Six carpes, six passages de la vie

Nagomi is an interactive, procedurally animated koi pond that runs in your browser. The fish
swim on their own, change depth, react to nearby fish, and gather around the
water when you click or tap. Ripples, currents, lotus leaves, changing weather,
and optional river sounds help the pond feel alive.

The fish are not following a recorded animation. Instead, each fish uses a few
simple rules to decide where to swim, how quickly to turn, and how its body and
tail should bend. The program calculates these movements continuously while
you watch. This is called **procedural animation**: behavior is created in real
time rather than played from a fixed video or set of frames.

New to procedural animation? Read [How Nagomi works](docs/how-it-works.md).


https://github.com/user-attachments/assets/34549f7d-41cf-4cf6-af0a-95074bc631d2


## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Tune

The pond contains exactly six koi carp, one of each pattern, representing the six passages of life. Small fish schools and population controls are disabled, including for restored settings.

Edit `src/settings/definition.ts` to change fish sizes, koi colors, water colors,
lotus leaves, flowers, and shadow strength.

## Controls

- Click or tap to call the fish.
- Press `Space` to scatter them.
- Press `D` to show the procedural spine.
- Press `H` to hide the interface.
- Press `R` to reset the simulation.

## Vercel

The project uses Vite, `npm run build`, and the `dist` output directory. Connect `Sitraka17/shinkzuku` to Vercel with `main` as the production branch. `vercel.json` provides the build settings and HTTP headers.

## Credits

Based on [Nagomi by Mayank Kadam](https://github.com/msk1039/procedural-koi-threejs). See [LICENSE](LICENSE) for the original PolyForm Noncommercial terms and required notice.

## Materials and writing

Choose a pond floor with **Fond**: light sand (default), cut stone, cobblestone,
brick, wood, pool tiles, or the original green pond. **Créer** customizes the
material colors and generates a new texture; the settings stay on this device.

**Main** calls the six carp. **Bâton** selects sand and lets you draw with a mouse,
stylus, or finger. The entire inscription disappears seven seconds after the last
mark, measured in wall-clock time, including after a background tab resumes.
Writing stays below the fish and water and is never persisted or uploaded.
Selecting a different material returns to hand mode. `R` also clears the writing.
