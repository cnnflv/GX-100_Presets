# GX-100 Preset Studio

Create presets for the **BOSS GX-100** from a song, an album, an artist's style or a sound description — in a single HTML file.

**Open it here:** (https://github.com/cnnflv/GX-100_Presets)

- Designs the full patch (amp model, drive pedals, EQ, modulation, delay, reverb) with an AI engine of your choice: Claude (Anthropic), ChatGPT (OpenAI), Gemini (Google), Meta (Muse Spark), or copy/paste with any AI chat (ChatGPT, Gemini, Copilot, Meta AI, Claude…).
- Compensates gain and EQ for **your** guitar (model, pickup type, pickup position).
- Saves a ready-to-import `.tsl` file for BOSS TONE STUDIO, with notes and a parameter-by-parameter justification table.
- Sends the patch **directly to the pedal via USB** (Web MIDI: Chrome, Edge, Opera) — try it on the current patch or save it to a user memory, with backup and verification.
- Interface in English, Italian, French, German, Spanish, Simplified Chinese and Japanese.

Everything is embedded in `index.html`: no installation, no server. API keys stay in your browser and are sent only to the provider you choose.

## Documentation

See [`docs/README.docx`](docs/README.docx): user guide, how to create API keys for each provider, USB compatibility by browser and operating system, license.

## Source

`src/` contains the files used to build `index.html` (page layout, translations, `.tsl` engine, Web MIDI module, system prompt, assembly script). See `src/README.md`.

## License

Freeware — free to use and share, no warranty. See [LICENSE](LICENSE).
BOSS, GX-100 and BOSS TONE STUDIO are trademarks of Roland Corporation; this project is independent and not affiliated with Roland/BOSS. The embedded effect definitions and factory presets are extracted from BOSS TONE STUDIO for GX-100 and remain Roland's property; they are included solely to generate compatible files for personal use.

© 2026 Flavio Canonico
