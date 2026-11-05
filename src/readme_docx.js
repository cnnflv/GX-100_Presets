const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, ShadingType, LevelFormat, BorderStyle, PageBreak } = require('docx');

const F = 'Arial';
const P = (text, o = {}) => new Paragraph({ spacing: { after: 120 }, ...o, children: Array.isArray(text) ? text : [new TextRun({ text, font: F, size: 21, ...(o.run || {}) })] });
const B = (text, level = 0) => new Paragraph({ numbering: { reference: 'bul', level }, spacing: { after: 60 }, children: typeof text === 'string' ? [new TextRun({ text, font: F, size: 21 })] : text });
let NI = 0; const NEW = () => { NI++; };
const N = (text) => new Paragraph({ numbering: { reference: 'num', level: 0, instance: NI }, spacing: { after: 80 }, children: typeof text === 'string' ? [new TextRun({ text, font: F, size: 21 })] : text });
const H1 = t => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: t, font: F })] });
const H2 = t => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: t, font: F })] });
const R = (text, o = {}) => new TextRun({ text, font: F, size: 21, ...o });
const bold = t => R(t, { bold: true });
const mono = t => new TextRun({ text: t, font: 'Consolas', size: 19 });

function table(rows, widths) {
  const total = widths.reduce((a, b) => a + b, 0);
  return new Table({ width: { size: total, type: WidthType.DXA }, columnWidths: widths,
    rows: rows.map((r, i) => new TableRow({ tableHeader: i === 0, children: r.map((c, j) => new TableCell({
      width: { size: widths[j], type: WidthType.DXA }, margins: { top: 60, bottom: 60, left: 100, right: 100 },
      shading: i === 0 ? { type: ShadingType.CLEAR, fill: '1F4E78', color: 'auto' } : (i % 2 === 0 ? { type: ShadingType.CLEAR, fill: 'EEF3F8', color: 'auto' } : undefined),
      children: [new Paragraph({ children: [new TextRun({ text: c, font: F, size: 19, bold: i === 0, color: i === 0 ? 'FFFFFF' : undefined })] })] })) })) });
}

const c = [];
c.push(new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: 'GX-100 Preset Studio', font: F })] }));
c.push(P([R('User guide, API setup, compatibility and license', { size: 24, color: '555555' })]));
c.push(P([R('Version 1.1 · November 2026 · Author: Flavio Canonico', { size: 20, color: '777777' })]));

NEW(); c.push(H1('1. What GX-100 Preset Studio is'));
c.push(P('GX-100 Preset Studio is a single HTML file that creates presets (patches) for the BOSS GX-100 guitar effects processor. You describe the sound you want — a specific song, an album, the style of an artist, or simply a sound in words — and the page designs a complete patch for you: amplifier model, drive pedals, equaliser, modulation, delay and reverb, with every parameter set and explained.'));
c.push(P('The page works on Windows, macOS, Linux and ChromeOS. Everything it needs is embedded in the file: the effect and parameter definitions of BOSS TONE STUDIO for GX-100 (version 2.0.3), the 100 factory presets used as starting templates, the guitar compensation profiles, the .tsl file generator and the USB (MIDI SysEx) sender. Nothing is installed on your computer and no server is involved, apart from the optional call to the AI provider of your choice (Anthropic Claude, OpenAI ChatGPT, Google Gemini or Meta) that does the actual sound design.'));
c.push(P('What you get for each request:'));
c.push(B([bold('A .tsl preset file'), R(' ready to import in BOSS TONE STUDIO (LIBRARIAN → IMPORT → FILE) or to send directly to the pedal via USB.')]));
c.push(B([bold('Notes'), R(': the original gear and signal chain of the song, the design choices, a table with every parameter and the reason behind it, sources, open assumptions and one or two parameters worth tweaking by ear.')]));
c.push(B([bold('Guitar compensation'), R(': the preset is designed for the guitar used on the original recording, then gain and EQ are corrected for your guitar (model, pickup type and pickup position) so the result sounds right with your instrument.')]));
c.push(B([bold('The spec'), R(' (a small JSON document) that you can edit by hand and regenerate, or save and share.')]));

NEW(); c.push(H1('2. Quick start'));
c.push(N('Open GX100_Preset_Studio.html in Chrome or Edge (double-click the file). Choose your language with the flags at the top right — English is the default.'));
c.push(N('Describe the preset you want in the first field. Be specific: song and artist, which part (rhythm, solo, intro), which version (studio or a particular live recording). Or describe the sound in words.'));
c.push(N('Select your guitar model, pickup type and pickup position, and whether you want a single chain (one amp), a dual chain (two amps in parallel through DIVIDER/MIXER) or let the page decide.'));
c.push(N('Choose the engine: one of the API engines (Claude, ChatGPT, Gemini or Meta — each needs its own API key, see section 4) or "copy/paste" (no key: you carry the text to any AI chat yourself, see section 5). Press "Create preset".'));
c.push(N('Read the notes, adjust the file name if you like, then "Save preset .tsl" and/or send it to the pedal with "Try" or "Save to memory" (section 6).'));

NEW(); c.push(H1('3. The page, section by section'));
NEW(); c.push(H2('1 · Request'));
c.push(table([
  ['Field', 'Meaning'],
  ['Preset to create', 'Free text: song, album, artist style or sound description. Add the part (rhythm/solo) and version (studio/live, year) when it matters.'],
  ['Guitar model', 'Your guitar (Stratocaster, Telecaster, Les Paul, PRS, SG, ES-335, superstrat, Jackson…) or, for other guitars, the body type. Used for tonal compensation.'],
  ['Pickup type', 'Single coil, hot single coil, P-90, mini humbucker, passive humbucker, high-output humbucker (normal or bright), active humbucker.'],
  ['Pickup position', 'Bridge, middle, neck or the in-between positions.'],
  ['Chain', 'Automatic, single (one amp) or dual (two amps via DIVIDER/MIXER, e.g. the classic "Mesa + Marshall" rhythm blend).'],
  ['Engine', 'Claude (Anthropic), ChatGPT (OpenAI), Gemini (Google) or Meta (Muse Spark): the page calls the provider directly with your API key. Copy/paste: the page prepares a text for any AI chat and reads the JSON reply.'],
], [2600, 7000]));
c.push(P(''));
NEW(); c.push(H2('2 · Preset created'));
c.push(P('Shows the notes (editable), the suggested file name, the patch name as it will appear on the pedal (16 characters max), and the save buttons. The collapsible panel at the bottom contains the JSON spec and the decoded chain. You can edit the spec by hand (change a value, swap an effect type) and press "Rebuild from spec"; errors such as an unknown label are reported with the list of valid options.'));
NEW(); c.push(H2('3 · Send to the GX-100 via USB'));
c.push(B([bold('Try'), R(' writes the patch into the pedal\'s temporary (current) patch: you hear it immediately, nothing is saved. Switching patch on the pedal discards it.')]));
c.push(B([bold('Save to memory'), R(' writes the patch into the user memory you type (U01-1 … U50-4), after a confirmation. The previous content of that memory is overwritten.')]));
c.push(B([bold('Verify after sending'), R(' reads the data back from the pedal and compares it byte by byte.')]));
c.push(B([bold('Backup memory → .tsl'), R(' reads a user memory and saves it as a .tsl file, so you can restore it later by importing it in BOSS TONE STUDIO.')]));
c.push(P('BOSS TONE STUDIO must be closed while the page talks to the pedal: two programs cannot share the same MIDI port. See Appendix A for the browsers and systems that support direct USB.'));

NEW(); c.push(H1('4. AI engines and API keys'));
c.push(P('The API engines send your request straight from the browser to the provider. Each provider needs its own API key, which is separate from any consumer subscription (ChatGPT Plus, Claude Pro, Gemini Advanced and so on do not include API access). API usage is billed per request on a pay-as-you-go basis; a preset typically costs a few cents, more when web search is enabled. Keys are stored only in your browser (localStorage), one per provider, and are sent exclusively to that provider.'));
c.push(table([
  ['Engine', 'Where to create the key', 'Default model', 'Web search'],
  ['Claude (Anthropic)', 'console.anthropic.com → API Keys', 'claude-sonnet-5-5 (claude-opus-5-5 for the most thorough designs)', 'Yes (web_search tool)'],
  ['ChatGPT (OpenAI)', 'platform.openai.com → API keys', 'gpt-5 (or any current GPT-5.x model)', 'Yes (Responses API web_search)'],
  ['Gemini (Google)', 'aistudio.google.com → Get API key', 'gemini-2.5-flash (gemini-2.5-pro or newer for best quality)', 'Yes (Google Search grounding)'],
  ['Meta (Muse Spark)', 'dev.meta.ai → Dashboard → API keys', 'muse-spark-1.3 (muse-wonder-1.0 for complex designs)', 'Yes (web_search tool)'],
  ['Copy/paste', 'No key needed', 'Whatever chat you paste into (ChatGPT, Gemini, Copilot, Meta AI, Claude…)', 'Depends on the chat'],
], [2000, 2700, 3000, 1900]));
c.push(P(''));
NEW(); c.push(H2('4.1 Anthropic (Claude)'));
c.push(N([R('Go to '), mono('https://console.anthropic.com'), R(' and sign up (or sign in).')]));
c.push(N('Open Settings → Billing and add a payment method or buy prepaid credits. Without credit the key is rejected with a "credit balance too low" error.'));
c.push(N([R('Open "API Keys" → "Create Key", name it (e.g. "GX-100 Preset Studio") and copy the key: it starts with '), mono('sk-ant-'), R(' and is shown only once.')]));
NEW(); c.push(H2('4.2 OpenAI (ChatGPT)'));
c.push(N([R('Go to '), mono('https://platform.openai.com'), R(' and sign in with your OpenAI account (the same account as ChatGPT works, but API billing is separate).')]));
c.push(N('Open Settings → Billing and add credit. New accounts may need to verify the organisation before some models are available.'));
c.push(N([R('Open "API keys" → "Create new secret key", copy the key (it starts with '), mono('sk-'), R(').')]));
c.push(N('The page uses the Responses API with the web_search tool. If your account or model does not support web search, the page retries without it.'));
NEW(); c.push(H2('4.3 Google (Gemini)'));
c.push(N([R('Go to '), mono('https://aistudio.google.com'), R(' and sign in with a Google account.')]));
c.push(N([R('Press "Get API key" → "Create API key" (in a new or existing Google Cloud project). The key starts with '), mono('AIza'), R('.')]));
c.push(N('Gemini has a free tier with daily limits, enough to try the page; for regular use enable billing on the project. Web search uses Google Search grounding, which is billed separately on paid tiers.'));
NEW(); c.push(H2('4.4 Meta (Muse Spark via Meta Model API)'));
c.push(N([R('Go to '), mono('https://dev.meta.ai'), R(', sign in and open the Dashboard.')]));
c.push(N('Create an API key (MODEL_API_KEY) and add billing where required. Meta Model API is pay-as-you-go.'));
c.push(N('The page calls the Responses API at api.meta.ai with the web_search tool. If your browser reports a blocked call (CORS), the provider does not allow direct browser access: use the copy/paste engine with Meta AI instead, or another provider.'));
NEW(); c.push(H2('4.5 Microsoft Copilot'));
c.push(P('The consumer Microsoft Copilot has no public API, so it cannot be an API engine. You can still use it with the copy/paste engine: prepare the text in the page, paste it in the Copilot chat, then paste the JSON reply back into the page. The same applies to Meta AI inside WhatsApp or Messenger, to the free ChatGPT and Gemini apps, and to any other chat assistant.'));
NEW(); c.push(H2('4.6 Which engine to choose'));
c.push(P('All engines receive the same instructions and the same GX-100 reference data, and the page validates every reply the same way (unknown labels or out-of-range values are sent back to the model for correction, up to three attempts). Quality nevertheless depends on the model: the request asks for a strict JSON document with hundreds of exact effect and parameter names, and small or free-tier models make more mistakes, so the correction loop runs more often and may fail. For the best results use a current top-tier model with web search enabled; for quick experiments any engine will do.'));
c.push(P([bold('Security notes. '), R('Treat every key like a password: anyone with the key can spend your credit. Do not share a browser profile where the keys are stored; you can revoke a key at any time from the provider console. When you open the HTML file from disk (file://), Chrome shares the stored keys with every other local HTML file opened in the same profile.')]));

NEW(); c.push(H1('5. Using an AI chat without an API key (copy/paste engine)'));
c.push(N('Select "Engine: copy/paste" and press "Prepare text", then "Copy".'));
c.push(N('Paste the text into any AI chat (Claude, ChatGPT, Gemini, Copilot, Meta AI…) and send it. The assistant answers with a JSON block.'));
c.push(N('Copy the whole reply, paste it in the "Step 2" box and press "Create preset from reply".'));
c.push(P('If the page reports an error (for example an unknown effect label), paste the error message back to the chat and ask it to fix the JSON, then try again. The text prepared by the page is long (about 50,000 characters) because it contains the full list of GX-100 effects, parameters and labels the model needs to be precise; some free chats may truncate very long messages.'));

NEW(); c.push(H1('6. Importing a preset manually'));
c.push(P('If you prefer not to use USB, or your browser does not support it: press "Save preset .tsl", then in BOSS TONE STUDIO for GX-100 open LIBRARIAN → IMPORT → FILE, select the .tsl file and drag the patch into a user memory. The notes (.md) and spec (.json) files are optional and only for your reference.'));

c.push(new Paragraph({ children: [new PageBreak()] }));
NEW(); c.push(H1('Appendix A — Compatibility of direct USB connectivity'));
c.push(P('Direct sending uses the Web MIDI API with System Exclusive (SysEx) messages, the same protocol BOSS TONE STUDIO uses. Web MIDI is available only in Chromium-based browsers; the first time, the browser asks for permission to "control and reprogram MIDI devices" — accept it. Saving the .tsl file works in every browser and does not need Web MIDI.'));
c.push(table([
  ['Browser / system', 'Direct USB', 'Notes'],
  ['Google Chrome – Windows 10/11', 'Yes', 'Install the BOSS GX-100 USB driver from boss.info if the pedal is not listed as a MIDI port.'],
  ['Google Chrome – macOS 11 or later', 'Yes', 'No driver needed (class-compliant USB MIDI).'],
  ['Google Chrome – Linux', 'Yes', 'ALSA sequencer; the pedal appears as "GX-100 MIDI".'],
  ['Google Chrome – ChromeOS', 'Yes', 'USB-C/USB-A adapter may be required.'],
  ['Microsoft Edge (Windows, macOS, Linux)', 'Yes', 'Same engine as Chrome.'],
  ['Opera, Vivaldi, Brave', 'Yes*', 'Brave blocks Web MIDI by default: allow it in the site permissions (shield icon).'],
  ['Chrome on Android', 'Possible', 'Requires a USB OTG cable; not tested.'],
  ['Mozilla Firefox 108 or later', 'Limited', 'Web MIDI is behind a site-permission add-on prompt; SysEx support is inconsistent. Not recommended.'],
  ['Safari – macOS', 'No', 'Safari does not implement Web MIDI. Save the .tsl and import it in BOSS TONE STUDIO.'],
  ['Safari / any browser – iOS, iPadOS', 'No', 'Apple does not allow Web MIDI on iOS. Use the .tsl file with BOSS TONE STUDIO on a computer.'],
  ['Bluetooth (BOSS BT-DUAL adapter)', 'macOS only', 'Pair "GX-100 MIDI" from Audio MIDI Setup → Window → Show MIDI Studio → Bluetooth; the page then sees it as a MIDI port. Windows has no native BLE-MIDI support.'],
], [3300, 1300, 5000]));
c.push(P(''));
c.push(P([bold('Requirements on the pedal side. '), R('GX-100 connected via USB (not through a hub if you have problems), firmware 2.0 or later (the embedded data were extracted from BOSS TONE STUDIO 2.0.3), BOSS TONE STUDIO closed. The page performs the same handshake as the official application (identity request, communication level check, editor mode on/off). The MIDI protocol was verified byte for byte against BOSS TONE STUDIO; always keep a backup of the memory you overwrite.')]));
c.push(P([bold('Other requirements. '), R('A modern browser (2023 or later). Internet access is needed only for the API engines. Screen width of at least 900 px is recommended; the page also works on tablets.')]));

NEW(); c.push(H1('Appendix B — Files in the package'));
c.push(table([
  ['File', 'Purpose'],
  ['GX100_Preset_Studio.html', 'The application. This is the only file you need to use or share.'],
  ['README.docx', 'This document.'],
  ['src/', 'Source files used to build the HTML (page layout, translations, .tsl engine, MIDI module, system prompt, assembly script). Only needed if you want to modify the application.'],
], [3300, 6300]));

NEW(); c.push(H1('License and credits'));
c.push(P([bold('GX-100 Preset Studio is freeware.'), R(' You may use it free of charge, for personal and professional purposes, and share the unmodified package with anyone. You may not sell it, bundle it in a paid product, or remove this notice and the author credits. Modified versions may be shared provided they remain free, keep this license and clearly state that they have been modified.')]));
c.push(P('THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED. Writing data to a BOSS GX-100 overwrites the selected memory; the author is not liable for lost presets, damage or any other consequence of using this software. Always back up your memories before writing.'));
c.push(P('The effect definitions and factory presets embedded in the file are extracted from BOSS TONE STUDIO for GX-100 and remain the property of Roland Corporation; they are included solely to let the application generate files compatible with that software, for personal use. BOSS, GX-100 and BOSS TONE STUDIO are trademarks of Roland Corporation. This project is independent and not affiliated with, endorsed by or supported by Roland Corporation or BOSS. Claude and Anthropic are trademarks of Anthropic, PBC; ChatGPT and OpenAI of OpenAI; Gemini and Google of Google LLC; Meta and Muse of Meta Platforms, Inc.; Copilot of Microsoft Corporation. Use of each API is subject to that provider\'s terms and billing.'));
c.push(P('Other brand and amplifier names mentioned in the generated notes (Fender, Marshall, Mesa/Boogie, VOX, Orange, Bogner, Matchless, Ibanez, Electro-Harmonix, MXR, ProCo, Klon…) are trademarks of their respective owners and are used only to describe the sounds the models are based on.'));
c.push(P([bold('Author and credits: '), R('concept, design and development by '), bold('Flavio Canonico'), R(' (2026). Built with the help of Claude by Anthropic. Thanks to the guitar community whose documented rigs make tone research possible.')]));

const doc = new Document({
  styles: { default: { document: { run: { font: F, size: 21 } } },
    paragraphStyles: [
      { id: 'Title', name: 'Title', basedOn: 'Normal', run: { font: F, size: 48, bold: true, color: '1F4E78' }, paragraph: { spacing: { before: 0, after: 120 } } },
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: F, size: 30, bold: true, color: '1F4E78' }, paragraph: { spacing: { before: 320, after: 120 }, keepNext: true, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: F, size: 24, bold: true, color: '2E5C8A' }, paragraph: { spacing: { before: 200, after: 80 }, keepNext: true, outlineLevel: 1 } },
    ] },
  numbering: { config: [
    { reference: 'bul', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] },
    { reference: 'num', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 360 } } } }] },
  ] },
  sections: [{ properties: { page: { margin: { top: 1300, bottom: 1300, left: 1300, right: 1300 } } }, children: c }],
});
Packer.toBuffer(doc).then(b => { fs.writeFileSync(process.argv[2] || 'README.docx', b); console.log('ok'); });
