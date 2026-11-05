/* Invio al GX-100 via Web MIDI (porting di gx100_send.py). Richiede Chrome/Edge/Opera. */
const GXMIDI = (() => {
  const MODEL_ID = [0x00, 0x00, 0x00, 0x00, 0x0B];
  const TEMP_BASE = 33554432, USER_BASE_1 = 67108864, USER_STEP = 98304;
  const ADDR_COMM_LEVEL = 0x7F000000, ADDR_EDITOR_MODE = 0x7F000001, COMM_LEVEL_EXPECTED = 4;
  const BLOCKS = [['User_patch%common', 0, [128, 1]], ['User_patch%led', 192, [28]]];
  for (let i = 1; i <= 20; i++) BLOCKS.push([`User_patch%assign(${i})`, 256 + (i - 1) * 64, [45]]);
  BLOCKS.push(['User_patch%efct', 1920, [62]]);
  for (let i = 1; i <= 20; i++) BLOCKS.push([`User_patch%fxItem(${i})`, 2176 + (i - 1) * 256, [131, 48]]);
  const BLOCK_LEN = { 'User_patch%common': 129, 'User_patch%led': 28, 'User_patch%efct': 62 };
  const blen = n => BLOCK_LEN[n] || (n.includes('assign') ? 45 : 179);
  const to7 = x => [(x >> 21) & 0x7F, (x >> 14) & 0x7F, (x >> 7) & 0x7F, x & 0x7F];
  const from7 = b => (b[0] << 21) | (b[1] << 14) | (b[2] << 7) | b[3];
  const to7raw = x => [(x >> 24) & 0x7F, (x >> 16) & 0x7F, (x >> 8) & 0x7F, x & 0x7F];
  const checksum = d => (128 - (d.reduce((s, v) => s + v, 0) % 128)) & 0x7F;
  const dt1 = (dev, addr, data) => { const a = to7(addr); return [0xF0, 0x41, dev, ...MODEL_ID, 0x12, ...a, ...data, checksum([...a, ...data]), 0xF7]; };
  const rq1 = (dev, addr, size) => { const a = to7(addr), s = to7(size); return [0xF0, 0x41, dev, ...MODEL_ID, 0x11, ...a, ...s, checksum([...a, ...s]), 0xF7]; };
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  function slotIndex(s) {
    const m = /^[Uu]?(\d{1,2})-([1-4])$/.exec(String(s).trim());
    if (!m) throw new Error('Memoria non valida: usa il formato U05-2 (banco 01-50, numero 1-4)');
    const bank = +m[1], num = +m[2];
    if (bank < 1 || bank > 50) throw new Error('Banco fuori range (01-50)');
    return (bank - 1) * 4 + num;
  }
  const slotName = i => `U${String(Math.floor((i - 1) / 4) + 1).padStart(2, '0')}-${(i - 1) % 4 + 1}`;

  function patchBlocks(tsl, n = 1) {
    if (!['GX-100', 'GX-10'].includes(tsl.device)) throw new Error('Il file non è un preset GX-100');
    const rows = tsl.data[0];
    if (n < 1 || n > rows.length) throw new Error(`Il file contiene ${rows.length} patch`);
    const ps = rows[n - 1].paramSet, out = {};
    for (const [name] of BLOCKS) {
      const arr = ps[name];
      if (!arr || arr.length !== blen(name)) throw new Error(`Blocco ${name} mancante o di lunghezza errata`);
      const vals = arr.map(h => parseInt(h, 16));
      if (vals.some(v => v > 0x7F || isNaN(v))) throw new Error(`Blocco ${name} contiene byte non validi`);
      out[name] = vals;
    }
    const pname = String.fromCharCode(...out['User_patch%common'].slice(0, 16)).trimEnd();
    return { blocks: out, name: pname };
  }
  function buildMessages(dev, base, blocks, temporary) {
    let order = BLOCKS.slice();
    if (temporary) order = [...BLOCKS.filter(b => b[0] === 'User_patch%efct'), ...BLOCKS.filter(b => b[0] !== 'User_patch%efct')];
    const msgs = [];
    for (const [name, off, chunks] of order) {
      let pos = 0;
      for (const size of chunks) { msgs.push(dt1(dev, base + off + pos, blocks[name].slice(pos, pos + size))); pos += size; }
    }
    return msgs;
  }

  class GX {
    constructor(log) { this.log = log || (() => {}); this.dev = 0x10; this.bt = false; this.queue = []; }
    async open(portHint) {
      if (!navigator.requestMIDIAccess) throw new Error('Web MIDI non disponibile: usa Chrome, Edge o Opera (Safari e Firefox non lo supportano).');
      const acc = await navigator.requestMIDIAccess({ sysex: true });
      const hint = (portHint || 'GX-100').toLowerCase();
      const pick = m => [...m.values()].find(p => p.name.toLowerCase().includes(hint));
      this.out = pick(acc.outputs); this.inp = pick(acc.inputs);
      if (!this.out || !this.inp) {
        const o = [...acc.outputs.values()].map(p => p.name).join(', ') || '(nessuna)';
        throw new Error(`GX-100 non trovato. Porte MIDI viste: ${o}. Collega il cavo USB e chiudi BOSS TONE STUDIO.`);
      }
      this.bt = /bluetooth|ble/i.test(this.out.name);
      this.inp.onmidimessage = e => { const d = Array.from(e.data); if (d[0] === 0xF0) this.queue.push(d); };
      this.log(`Porta: ${this.out.name}${this.bt ? ' (Bluetooth)' : ''}`);
    }
    async send(msg) {
      this.out.send(new Uint8Array(msg));
      await sleep(msg.length / 3.125 + (this.bt ? 60 : 10));
    }
    async receive(match, timeout = 3000) {
      const end = Date.now() + timeout;
      while (Date.now() < end) {
        const i = this.queue.findIndex(match);
        if (i >= 0) return this.queue.splice(i, 1)[0];
        await sleep(5);
      }
      return null;
    }
    async read(addr, size, raw) {
      const lin = raw ? from7(to7raw(addr)) : addr;
      this.queue.length = 0;
      await this.send(rq1(this.dev, lin, size));
      const a = to7(lin);
      const r = await this.receive(d => d.length > 15 && d[1] === 0x41 && d[8] === 0x12 && a.every((v, i) => d[9 + i] === v), this.bt ? 5000 : 3000);
      return r ? r.slice(13, -2) : null;
    }
    async handshake() {
      this.queue.length = 0;
      await this.send([0xF0, 0x7E, 0x7F, 0x06, 0x01, 0xF7]);
      const r = await this.receive(d => d[1] === 0x7E && d[3] === 0x06 && d[4] === 0x02 && d[5] === 0x41);
      if (!r) throw new Error('Il GX-100 non risponde (identity request). Controlla collegamento e porta.');
      this.dev = r[2];
      const lvl = await this.read(ADDR_COMM_LEVEL, 1, true);
      if (!lvl) throw new Error('Il GX-100 non risponde alle richieste dati.');
      if (lvl[0] !== COMM_LEVEL_EXPECTED) this.log(`ATTENZIONE: livello di comunicazione ${lvl[0]} (atteso ${COMM_LEVEL_EXPECTED}): firmware diverso.`);
      await this.send(dt1(this.dev, from7(to7raw(ADDR_EDITOR_MODE)), [1]));
    }
    async bye() { try { await this.send(dt1(this.dev, from7(to7raw(ADDR_EDITOR_MODE)), [0])); } finally { if (this.inp) this.inp.onmidimessage = null; } }
    async verify(base, blocks) {
      let bad = 0;
      for (const [name, off, chunks] of BLOCKS) {
        let pos = 0;
        for (const size of chunks) {
          const got = await this.read(base + off + pos, size);
          const exp = blocks[name].slice(pos, pos + size);
          if (!got || got.length !== exp.length || got.some((v, i) => v !== exp[i])) { bad++; this.log(`  DIFFERENZA in ${name} (byte ${pos}-${pos + size - 1})`); }
          pos += size;
        }
      }
      return bad;
    }
    async readPatch(base) {
      const ps = {};
      for (const [name, off, chunks] of BLOCKS) {
        let data = [], pos = 0;
        for (const size of chunks) {
          const got = await this.read(base + off + pos, size);
          if (!got || got.length !== size) throw new Error('Lettura fallita su ' + name);
          data = data.concat(got); pos += size;
        }
        ps[name] = data.map(v => v.toString(16).toUpperCase().padStart(2, '0'));
      }
      return ps;
    }
  }

  /* API principale */
  async function sendPatch(tsl, { mode = 'temp', slot, verify = false, patchIndex = 1, port, log, progress }) {
    const { blocks, name } = patchBlocks(tsl, patchIndex);
    let base, dest;
    if (mode === 'temp') { base = TEMP_BASE; dest = 'patch corrente (non salvata)'; }
    else { const idx = slotIndex(slot); base = USER_BASE_1 + (idx - 1) * USER_STEP; dest = 'memoria ' + slotName(idx); }
    const gx = new GX(log);
    await gx.open(port);
    try {
      await gx.handshake();
      const msgs = buildMessages(gx.dev, base, blocks, mode === 'temp');
      for (let i = 0; i < msgs.length; i++) { await gx.send(msgs[i]); if (progress) progress(i + 1, msgs.length); }
      await sleep(300);
      if (verify) { const bad = await gx.verify(base, blocks); log(bad ? `Verifica: ${bad} differenze. Ripeti l'invio.` : 'Verifica OK: i dati sul pedale coincidono.'); }
    } finally { await gx.bye(); }
    return `"${name}" inviato in ${dest}.`;
  }
  async function readSlot(slot, { port, log }) {
    const idx = slotIndex(slot);
    const gx = new GX(log);
    await gx.open(port);
    let ps;
    try { await gx.handshake(); ps = await gx.readPatch(USER_BASE_1 + (idx - 1) * USER_STEP); } finally { await gx.bye(); }
    const name = String.fromCharCode(...ps['User_patch%common'].slice(0, 16).map(h => parseInt(h, 16))).trimEnd();
    return { name, slot: slotName(idx), tsl: { name: 'BACKUP ' + slotName(idx), formatRev: '0000', device: 'GX-100', data: [[{ memo: JSON.stringify({ memo: '', isToneCentralPatch: false }), paramSet: ps }]] } };
  }
  function sysexBytes(tsl, mode, slot, patchIndex = 1) {
    const { blocks } = patchBlocks(tsl, patchIndex);
    const base = mode === 'temp' ? TEMP_BASE : USER_BASE_1 + (slotIndex(slot) - 1) * USER_STEP;
    return buildMessages(0x10, base, blocks, mode === 'temp');
  }
  return { sendPatch, readSlot, sysexBytes, supported: () => !!navigator.requestMIDIAccess };
})();
