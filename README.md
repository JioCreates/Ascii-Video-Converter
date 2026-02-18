```
     _    ____   ____ ___ ___   ____  _        _ __   _______ ____
    / \  / ___| / ___|_ _|_ _| |  _ \| |      / \\ \ / / ____|  _ \
   / _ \ \___ \| |    | | | |  | |_) | |     / _ \\ V /|  _| | |_) |
  / ___ \ ___) | |___ | | | |  |  __/| |___ / ___ \| | | |___|  _ <
 /_/   \_\____/ \____|___|___| |_|   |_____/_/   \_\_| |_____|_| \_\
```

**Turn any video into a retro ASCII terminal experience.**

Drop a video file. Point your webcam. Watch it render in real-time as ASCII characters on a glowing CRT terminal. Add VHS glitches, Matrix rain, psychedelic colors, datamosh artifacts, and more. All in your browser.

---

## Run It

```bash
git clone https://github.com/JioCreates/Ascii-Video-Converter.git
cd Ascii-Video-Converter
npm install
npm run dev
```

Open `http://localhost:5173`. That's it.

> Requires [Node.js](https://nodejs.org/) (v18+)

---

## What Can It Do?

| Feature | Description |
|---|---|
| **Video + Webcam + Screen Capture** | Drag & drop files, paste URLs, use your webcam, or capture your screen |
| **Real-time ASCII Rendering** | Canvas-based renderer with Web Workers for smooth performance |
| **CRT Mode** | Scanlines, phosphor glow, screen curvature, burn-in, interlace |
| **Phosphor Colors** | Green, amber, white, blue, red, pink, cyan, purple |
| **VHS Effects** | Timestamp overlay, channel switching, tracking glitches |
| **Visual FX** | Matrix rain, psychedelic colors, figlet text, datamosh, mirror/flip |
| **Audio Reactive** | Effects respond to audio frequency data in real-time |
| **GIF / Screenshot / Video Export** | Save as PNG, record WebM, or export GIF |
| **Custom Presets** | Save your combos, share them via URL hash |
| **Multiple Character Sets** | Standard, blocks, binary, katakana, braille, and more |
| **Keyboard-Driven** | 30+ hotkeys - no mouse needed |

---

## Keyboard Controls

The whole app is keyboard-driven. Press `?` in the app for the full list.

```
SPACE .... Play / Pause          C ........ Toggle CRT mode
J ........ Reverse playback      V ........ Cycle phosphor color
S ........ Cycle speed           B ........ Toggle burn-in
LEFT/RIGHT Seek -5s / +5s       N ........ Toggle interlace
                                 T ........ VHS timestamp
1-9 ...... Toggle effects        D ........ Datamosh
E ........ Cycle color mode      L ........ Scan lines
+/- ...... Effect intensity      W ........ Channel switch
A ........ Auto-cycle FX         H ........ Marquee text
R ........ Randomize FX          Q ........ Mirror / Flip
0 ........ Reset all FX
                                 P ........ Screenshot (PNG)
X ........ Cycle charset          G ........ Record WebM
M ........ Audio reactive        Y ........ Copy ASCII text
F ........ Fullscreen            ? ........ Help
SCROLL ... Adjust resolution     ESC ...... Back / Eject
```

---

## Tech

- React 19 + TypeScript
- Vite
- Canvas rendering with Web Workers
- Web Audio API
- Zero backend. Zero dependencies beyond React.

---

## Contributing

Pull requests are welcome! Here are some ideas to get started:

### New Effects
- **Thermal Vision** - Heat map color mode based on pixel brightness
- **ASCII Rain** - Falling characters like cmatrix
- **Pixelsort** - Glitch art pixel sorting effect
- **Film Grain** - Old film noise and scratches overlay
- **Chromatic Aberration** - RGB channel splitting
- **Edge Detection** - Render only outlines/edges as ASCII

### New Character Sets
- Emoji set (render video in emojis)
- Box-drawing characters (smooth gradients)
- Custom user-defined character ramps

### New Features
- **Drag & drop presets** - Import/export preset files
- **MIDI input** - Map MIDI controllers to effect parameters
- **Multi-source compositing** - Picture-in-picture, split screen
- **Live streaming output** - Stream ASCII output via WebRTC
- **Mobile touch controls** - Swipe gestures for effects
- **Themes** - Full terminal theme packs beyond phosphor colors
- **YouTube URL support** - Paste a YouTube link and play it
- **Sound effects** - CRT power-on hum, VHS tape sounds, static noise
- **Animated boot sequences** - Custom startup animations

### Performance & Quality
- WASM-based renderer for higher framerates
- GPU-accelerated rendering via WebGL
- Adaptive resolution based on device performance

### How to Contribute
1. Fork the repo
2. Create a branch (`git checkout -b my-feature`)
3. Make your changes
4. Test it (`npm run dev`)
5. Submit a PR

No contribution is too small. Bug fixes, typo corrections, and documentation improvements are all appreciated.

---

## License

[MIT](LICENSE) - Do whatever you want with it.
