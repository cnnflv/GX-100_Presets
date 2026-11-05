# Source files

Rebuild `GX100_Preset_Studio.html` from these sources:

    cp -r <boss-gx100 skill>/scripts <boss-gx100 skill>/data .   # gx100_data.json + guitar_profiles.json
    node assemble.js

- page.html — layout and page logic (placeholders /*__DATA__*/ etc.)
- i18n.js — UI translations (en, it, fr, de, es, zh, ja) and flag icons
- engine.js — .tsl generator (byte-identical port of gx100_tsl.js)
- midi.js — Web MIDI sender (SysEx identical to gx100_send.py)
- system_prompt.md — instructions for Claude (the page appends the effect/parameter reference)
- readme_docx.js — generates README.docx (`node readme_docx.js README.docx`)
