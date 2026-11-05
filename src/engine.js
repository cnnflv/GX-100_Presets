/* GX-100 engine (browser) — porting di gx100_tsl.js senza fs/vm.
   createEngine(DATA, PROFILES) -> { buildTsl(spec), listTemplates(), dumpTemplate(name), referenceText(), nameOf } */
function createEngine(D, PROFILES, L) {
  L = Object.assign({ title:'giustificazione parametri', colSection:'Sezione', colValues:'Valori impostati', colWhy:'Motivo della scelta', refGuitar:'Chitarra di riferimento (originale)', yourGuitar:'Tua chitarra', presetFile:'File preset', comp:'Compensazione', compWas:'comp.: era', compApplied:'Compensazione chitarra applicata ai valori marcati *comp.*.', noUser:'nessuna chitarra utente indicata: nessuna compensazione', noRef:'reference_guitar mancante: nessuna compensazione', ref:'riferimento', user:'tua chitarra', dOut:'Δ uscita', dEq:'Δ EQ', geqOn:'GRAPHIC EQ: era OFF, attivato per la compensazione', noEq:'AIRD PREAMP (nessun EQ in catena)' }, L || {});
  const TYPES = D.types, EP = D.effects, DEVICE = D.device, FORMAT_REV = D.formatRev;
  const RESLIST = D.reslist.map(t => t.split(',').map(x => x.trim()));
  const FACTORY = D.factory.map(b => { const o = {}; for (const k in b) o[k] = b[k].match(/../g); return o; });
  const BANDS = PROFILES.bands;

  const hex = n => n.toString(16).toUpperCase().padStart(2, '0');
  const nameOf = p => p['User_patch%common'].slice(0, 16).map(h => String.fromCharCode(parseInt(h, 16))).join('').trim();
  const findFactory = n => {
    const p = FACTORY.find(x => nameOf(x).toUpperCase() === String(n).toUpperCase());
    if (!p) throw new Error('template non trovato: ' + n);
    return JSON.parse(JSON.stringify(p));
  };

  function readParam(arr, q) {
    if (q.size === 0x10008) {
      const v = (parseInt(arr[q.address], 16) << 12) | (parseInt(arr[q.address + 1], 16) << 8) |
                (parseInt(arr[q.address + 2], 16) << 4) | parseInt(arr[q.address + 3], 16);
      return v - 32768;
    }
    return parseInt(arr[q.address], 16);
  }
  function writeParam(arr, q, v) {
    v = Number(v);
    if (!Number.isInteger(v) || v < q.min || v > q.max) throw new Error(`${q.name}: ${v} fuori range ${q.min}..${q.max}`);
    if (q.size === 0x10008) {
      const r = v + 32768;
      arr[q.address] = hex((r >> 12) & 15); arr[q.address + 1] = hex((r >> 8) & 15);
      arr[q.address + 2] = hex((r >> 4) & 15); arr[q.address + 3] = hex(r & 15);
    } else arr[q.address] = hex(v);
  }
  function labelLists(q) {
    const out = [];
    const tv = (q.templateValue || '').split(',').map(s => s.trim());
    if (tv.length >= q.max - q.min + 1 && tv.length > 1) out.push(tv);
    const r = q.resourceId !== undefined ? RESLIST[q.resourceId] : null;
    if (r && r.length === q.max - q.min + 1) out.push(r);
    return out;
  }
  function labels(q) { return labelLists(q)[0] || null; }
  function toValue(q, val) {
    if (typeof val === 'number') return val;
    for (const L of labelLists(q)) {
      const i = L.findIndex(s => s.toUpperCase() === String(val).toUpperCase());
      if (i >= 0) return q.min + i;
    }
    if (/^-?\d+$/.test(String(val))) return parseInt(val, 10);
    throw new Error(`${q.name}: etichetta "${val}" non riconosciuta (opzioni: ${labelLists(q).map(l => l.join(', ')).join(' | ') || q.templateValue})`);
  }
  const params = t => (EP[t] && EP[t].parameters || []).filter(q => typeof q.address === 'number');
  const findParam = (t, n) => {
    const q = params(t).find(q => q.name.toUpperCase() === String(n).toUpperCase());
    if (!q) throw new Error(`${t}: parametro "${n}" inesistente. Disponibili: ${params(t).map(q => q.name).join(', ')}`);
    return q;
  };

  function chainOrder(p) {
    const ef = p['User_patch%efct'];
    const order = []; let cur = parseInt(ef[12], 16) - 1, g = 0;
    while (cur >= 0 && g++ < 30) { order.push(cur); cur = parseInt(ef[13 + cur], 16) - 1; }
    return order;
  }
  function slotsByType(p) {
    const map = {};
    for (const i of chainOrder(p)) {
      const fx = p[`User_patch%fxItem(${i + 1})`];
      const t = TYPES[parseInt(fx[0], 16)];
      (map[t] = map[t] || []).push(i);
    }
    return map;
  }
  function resolveSlot(p, key) {
    const [t, nStr] = key.split('#');
    const list = slotsByType(p)[t];
    const n = nStr ? parseInt(nStr, 10) : 1;
    if (!list || list[n - 1] === undefined) throw new Error(`blocco "${key}" non presente nella catena del template (${nameOf(p)}): ${Object.keys(slotsByType(p)).join(", ")}`);
    return { type: t, slot: list[n - 1] };
  }
  function dumpLines(p) {
    const out = ['== ' + nameOf(p) + '  (catena: ' + chainOrder(p).map(i => i + 1).join(' > ') + ')'];
    for (const i of chainOrder(p)) {
      const fx = p[`User_patch%fxItem(${i + 1})`]; const t = TYPES[parseInt(fx[0], 16)];
      const s = params(t).map(q => { const v = readParam(fx, q); const L = labels(q); return `${q.name}=${L ? L[v - q.min] : v}`; });
      out.push(`  [${i + 1}] ${t}: ${s.join(', ')}`);
    }
    return out;
  }
  function chainTypes(p) { return chainOrder(p).map(i => TYPES[parseInt(p[`User_patch%fxItem(${i + 1})`][0], 16)]); }

  let COMP = null;
  function buildPatch(spec) {
    const p = findFactory(spec.template || 'JC CLEAN');
    const nm = (spec.name || 'NEW PATCH').toUpperCase().slice(0, 16).padEnd(16, ' ');
    for (let i = 0; i < 16; i++) { let c = nm.charCodeAt(i); if (c < 32 || c > 126) c = 32; p['User_patch%common'][i] = hex(c); }
    const ef = p['User_patch%efct'];
    if (spec.level !== undefined) { const v = spec.level; ef[0] = hex((v >> 4) & 15); ef[1] = hex(v & 15); }
    if (spec.bpm !== undefined) {
      const v = Math.round(spec.bpm * 10);
      ef[2] = hex((v >> 12) & 15); ef[3] = hex((v >> 8) & 15); ef[4] = hex((v >> 4) & 15); ef[5] = hex(v & 15);
    }
    for (const [from, to] of Object.entries(spec.replace || {})) {
      if (!TYPES.includes(to) || !EP[to]) throw new Error('tipo effetto sconosciuto: ' + to);
      const { slot } = resolveSlot(p, from);
      const fx = p[`User_patch%fxItem(${slot + 1})`];
      fx[0] = hex(TYPES.indexOf(to));
      for (let a = 3; a + 3 < fx.length; a += 4) { fx[a] = '08'; fx[a + 1] = '00'; fx[a + 2] = '00'; fx[a + 3] = '00'; }
      for (const q of params(to)) writeParam(fx, q, Number(q.init));
    }
    for (const [key, vals] of Object.entries(spec.blocks || {})) {
      const { type, slot } = resolveSlot(p, key);
      const fx = p[`User_patch%fxItem(${slot + 1})`];
      for (const [pn, pv] of Object.entries(vals)) { const q = findParam(type, pn); writeParam(fx, q, toValue(q, pv)); }
    }
    COMP = new Map();
    p.__report = applyGuitarCompensation(p, spec);
    p.__table = justificationTable(p, spec, COMP);
    COMP = null;
    return p;
  }

  function fmtVal(q, v) {
    const L = labels(q); if (L) return String(L[v - q.min]).replace(/\s*\(.*\)\s*$/, '');
    if (/USER 1-16/.test(q.templateValue || '')) {
      const base = q.templateValue.split(',').map(x => x.trim()).filter(x => !/USER/.test(x));
      return v - q.min < base.length ? base[v - q.min] : 'USER ' + (v - q.min - base.length + 1);
    }
    return String(v);
  }
  function justificationTable(p, spec, comp) {
    const why = spec.why || {};
    const esc = t => String(t).replace(/\|/g, '\\|').replace(/\n/g, ' ');
    const rows = []; const master = [];
    if (spec.bpm !== undefined) master.push(`BPM ${spec.bpm}`);
    if (spec.level !== undefined) master.push(`MEMORY LEVEL ${spec.level}`);
    if (master.length || why.MASTER) rows.push(['MASTER (patch)', master.join('; ') || '-', why.MASTER || '']);
    const keys = new Set([...Object.keys(spec.blocks || {}), ...Object.values(spec.replace || {})]);
    for (const k of [...keys]) { try { resolveSlot(p, k); } catch (e) { keys.delete(k); } }
    for (const i of chainOrder(p)) {
      const fx = p[`User_patch%fxItem(${i + 1})`];
      if (comp.has(fx)) { const t = TYPES[parseInt(fx[0], 16)]; const n = (slotsByType(p)[t] || []).indexOf(i) + 1; keys.add(n > 1 ? `${t}#${n}` : t); }
    }
    const pos = k => { try { return chainOrder(p).indexOf(resolveSlot(p, k).slot); } catch (e) { return 999; } };
    for (const key of [...keys].sort((a, b) => pos(a) - pos(b))) {
      const { type, slot } = resolveSlot(p, key);
      const fx = p[`User_patch%fxItem(${slot + 1})`];
      const set = Object.keys((spec.blocks || {})[key] || {});
      const changed = comp.get(fx) || {};
      const names = [...new Set([...set, ...Object.keys(changed)])];
      const on = parseInt(fx[1], 16) === 1;
      const vals = names.filter(n => n !== 'OFF/ON').map(n => {
        const q = findParam(type, n); let s = `${n} ${fmtVal(q, readParam(fx, q))}`;
        if (n in changed) s += ` *(${L.compWas} ${fmtVal(q, changed[n])})*`;
        return s;
      });
      const label = `${type}${key.includes('#') ? ' ' + key.split('#')[1] : ''}` + (!params(type).some(q => q.name === 'OFF/ON') ? '' : ` — ${on ? 'ON' : 'OFF'}`);
      let reason = why[key] || '';
      if (Object.keys(changed).length) reason += (reason ? ' ' : '') + L.compApplied;
      rows.push([label, on || vals.length ? (vals.join('; ') || '-') : '-', reason]);
    }
    const head = `### ${nameOf(p)}\n\n` + (spec.description ? spec.description + '\n\n' : '') +
      `| ${L.colSection} | ${L.colValues} | ${L.colWhy} |\n|---|---|---|\n`;
    return head + rows.map(r => `| ${r.map(esc).join(' | ')} |`).join('\n') + '\n';
  }

  function normGuitar(g, who) {
    if (!g) return null;
    const k = s => String(s || '').toLowerCase().replace(/[\s\-]+/g, '_').replace(/_?\+_?/g, '+');
    const model = g.model ? PROFILES.models[k(g.model)] : null;
    if (g.model && !model) throw new Error(`${who}: modello "${g.model}" sconosciuto. Validi: ${Object.keys(PROFILES.models).join(', ')}`);
    const body = k(g.body) || (model && model.body);
    const pickup = k(g.pickup) || (model && model.pickup);
    const position = k(g.position) || 'bridge';
    if (!PROFILES.body[body]) throw new Error(`${who}: body "${body}" sconosciuto. Validi: ${Object.keys(PROFILES.body).join(', ')}`);
    if (!PROFILES.pickup[pickup]) throw new Error(`${who}: pickup "${pickup}" sconosciuto. Validi: ${Object.keys(PROFILES.pickup).join(', ')}`);
    if (!PROFILES.position[position]) throw new Error(`${who}: posizione "${position}" sconosciuta. Valide: ${Object.keys(PROFILES.position).join(', ')}`);
    return { model: g.model ? k(g.model) : null, body, pickup, position, modelEq: model ? model.eq : null };
  }
  function fingerprint(g) {
    const parts = [PROFILES.pickup[g.pickup], PROFILES.position[g.position], PROFILES.body[g.body]];
    if (g.modelEq) parts.push({ output: 0, eq: g.modelEq });
    const eq = BANDS.map((_, i) => parts.reduce((s, x) => s + x.eq[i], 0));
    return { output: parts.reduce((s, x) => s + x.output, 0), eq };
  }
  const describe = g => `${g.model || g.body} / ${(L.pick && L.pick[g.pickup]) || PROFILES.pickup[g.pickup].label} / ${(L.pos && L.pos[g.position]) || PROFILES.position[g.position].label}`;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, Math.round(v)));
  const avg = (eq, idx) => idx.reduce((s, i) => s + eq[i], 0) / idx.length;
  function adjust(fx, type, pname, delta) {
    const q = findParam(type, pname);
    const before = readParam(fx, q);
    const after = clamp(before + delta, q.min, q.max);
    writeParam(fx, q, after);
    if (COMP && after !== before) { const m = COMP.get(fx) || {}; if (!(pname in m)) m[pname] = before; COMP.set(fx, m); }
    return `${pname} ${before}→${after}`;
  }
  function applyGuitarCompensation(p, spec) {
    const user = normGuitar(spec.guitar, 'guitar');
    const ref = normGuitar(spec.reference_guitar, 'reference_guitar');
    if (!user) return [L.noUser];
    if (!ref) return [L.noRef];
    const strength = spec.compensation_strength === undefined ? 1 : Number(spec.compensation_strength);
    const fr = fingerprint(ref), fu = fingerprint(user);
    const dOut = (fr.output - fu.output) * strength;
    const MAXDB = spec.max_eq_db === undefined ? 6 : spec.max_eq_db;
    const dEq = fr.eq.map((v, i) => Math.max(-MAXDB, Math.min(MAXDB, (v - fu.eq[i]) * strength)));
    const extraEq = spec.eq_trim || null;
    if (extraEq) for (const [b, v] of Object.entries(extraEq)) {
      const i = BANDS.indexOf(b); if (i < 0) throw new Error('eq_trim: banda sconosciuta ' + b); dEq[i] += v;
    }
    const rep = [`${L.ref}: ${describe(ref)}`, `${L.user}: ${describe(user)}`,
      `${L.dOut} ${dOut >= 0 ? '+' : ''}${dOut.toFixed(1)} dB; ${L.dEq} ${dEq.map(v => Math.round(v)).join(' ')}`];
    const sl = slotsByType(p);
    const fxOf = i => p[`User_patch%fxItem(${i + 1})`];
    const isOn = i => parseInt(fxOf(i)[1], 16) === 1;
    for (const i of sl['AIRD PREAMP'] || []) if (isOn(i) && Math.abs(dOut) >= 0.5)
      rep.push('AIRD PREAMP: ' + adjust(fxOf(i), 'AIRD PREAMP', 'GAIN', dOut * 2.5));
    for (const t of ['OVERDRIVE', 'DISTORTION', 'FUZZ', 'METAL DISTORTION', 'X OVERDRIVE', 'X DISTORTION', 'BOOSTER'])
      for (const i of sl[t] || []) if (isOn(i) && Math.abs(dOut) >= 0.5) {
        const pn = ['DRIVE', 'GAIN', 'BOOST'].find(n => params(t).some(q => q.name === n)) || null;
        if (pn) rep.push(`${t}: ` + adjust(fxOf(i), t, pn, dOut * 2));
      }
    const forceEq = spec.compensation_eq || null;
    const eqApplied = (() => {
      const g = forceEq && forceEq !== 'GRAPHIC EQUALIZER' ? undefined : (sl['GRAPHIC EQUALIZER'] || [])[0];
      if (g !== undefined) {
        const fx = fxOf(g);
        if (!isOn(g)) { for (const b of BANDS) writeParam(fx, findParam('GRAPHIC EQUALIZER', b), 0); fx[1] = hex(1); rep.push(L.geqOn); }
        rep.push('GRAPHIC EQ: ' + BANDS.map((b, i) => Math.round(dEq[i]) ? adjust(fx, 'GRAPHIC EQUALIZER', b, dEq[i]) : null).filter(Boolean).join(', '));
        return true;
      }
      const e = forceEq && forceEq !== 'PARAMETRIC EQUALIZER' ? undefined : (sl['PARAMETRIC EQUALIZER'] || [])[0];
      if (e !== undefined) {
        const fx = fxOf(e), T = 'PARAMETRIC EQUALIZER';
        if (!isOn(e)) { for (const n of ['LOW GAIN', 'LOW-MID GAIN', 'HIGH-MID GAIN', 'HIGH GAIN']) writeParam(fx, findParam(T, n), 0); fx[1] = hex(1); }
        rep.push('PARAMETRIC EQ: ' + [
          adjust(fx, T, 'LOW GAIN', avg(dEq, [1, 2, 3])), adjust(fx, T, 'LOW-MID GAIN', avg(dEq, [3, 4])),
          adjust(fx, T, 'HIGH-MID GAIN', avg(dEq, [5, 6, 7])), adjust(fx, T, 'HIGH GAIN', avg(dEq, [8, 9]))].join(', '));
        return true;
      }
      return false;
    })();
    if (!eqApplied) for (const i of sl['AIRD PREAMP'] || []) if (isOn(i)) {
      const fx = fxOf(i), T = 'AIRD PREAMP', k = 3;
      rep.push(L.noEq + ': ' + [
        adjust(fx, T, 'BASS', avg(dEq, [1, 2, 3]) * k), adjust(fx, T, 'MIDDLE', avg(dEq, [4, 5]) * k),
        adjust(fx, T, 'TREBLE', avg(dEq, [6, 7]) * k), adjust(fx, T, 'PRESENCE', avg(dEq, [8, 9]) * k)].join(', '));
    }
    const ampGain = (sl['AIRD PREAMP'] || []).map(i => readParam(fxOf(i), findParam('AIRD PREAMP', 'GAIN')));
    const sc = x => /single_coil/.test(x.pickup);
    if (sc(user) && !sc(ref) && Math.max(0, ...ampGain) >= 60)
      for (const i of sl['NOISE SUPPRESSOR'] || []) rep.push('NOISE SUPPRESSOR: ' + adjust(fxOf(i), 'NOISE SUPPRESSOR', 'THRESHOLD', 10));
    return rep;
  }

  /* spec completo -> { tsl (oggetto), tslText, md, dumps[], reports[] } */
  function buildTsl(spec, fileName) {
    const patches = spec.patches.map(ps => buildPatch(Object.assign(
      { guitar: spec.guitar, reference_guitar: spec.reference_guitar, compensation_strength: spec.compensation_strength, compensation_eq: spec.compensation_eq }, ps)));
    const reports = patches.map(p => { const r = p.__report; delete p.__report; return r; });
    const tables = patches.map(p => { const t = p.__table; delete p.__table; return t; });
    const tsl = { name: spec.liveset || 'CLAUDE PRESETS', formatRev: FORMAT_REV, device: DEVICE,
      data: [patches.map(ps => ({ memo: JSON.stringify({ memo: '', isToneCentralPatch: false }), paramSet: ps }))] };
    const g = spec.guitar ? normGuitar(spec.guitar, 'guitar') : null, r = spec.reference_guitar ? normGuitar(spec.reference_guitar, 'reference_guitar') : null;
    let md = `# ${tsl.name} — ${L.title}\n\n`;
    if (spec.description) md += spec.description + '\n\n';
    if (r) md += `- **${L.refGuitar}:** ${describe(r)}\n`;
    if (g) md += `- **${L.yourGuitar}:** ${describe(g)}\n`;
    md += `- **${L.presetFile}:** ${fileName || 'preset.tsl'}\n\n`;
    md += tables.join('\n') + '\n';
    md += reports.map((r, i) => `**${L.comp} ${nameOf(patches[i])}:** ` + r.join(' · ')).join('\n\n') + '\n';
    return { tsl, tslText: JSON.stringify(tsl), md, dumps: patches.map(dumpLines), reports, names: patches.map(nameOf) };
  }

  /* testo di riferimento per il modello: tipi, parametri con range/etichette, template */
  function referenceText(templates) {
    const L = [];
    L.push('TIPI DI EFFETTO (nomi esatti da usare in "replace" e come chiavi di "blocks"):');
    L.push(TYPES.filter(t => EP[t] && t !== 'MASTER').join(', '));
    L.push('');
    L.push('PARAMETRI PER EFFETTO (nome [min..max] init | etichette ammesse):');
    for (const t of TYPES) {
      if (!EP[t] || t === 'MASTER') continue;
      const ps = params(t);
      if (!ps.length) continue;
      L.push('- ' + t + ': ' + ps.map(q => {
        const lab = labels(q);
        let s = `${q.name} [${q.min}..${q.max}] init=${q.init}`;
        if (lab && lab.length <= 40) s += ' {' + lab.join('|') + '}';
        else if (lab) s += ' {' + lab.slice(0, 6).join('|') + '|…|' + lab[lab.length - 1] + ': usa il numero (indice ' + q.min + '..' + q.max + ') o l\'etichetta esatta}';
        else if (q.templateValue) s += ' (' + q.templateValue + ')';
        return s;
      }).join('; '));
    }
    L.push('');
    L.push('TEMPLATE DI FABBRICA (catena nell\'ordine del segnale; "#2" = secondo blocco dello stesso tipo):');
    for (const n of templates) {
      const p = findFactory(n); const seen = {};
      L.push('- ' + n + ': ' + chainTypes(p).map(t => { seen[t] = (seen[t] || 0) + 1; return seen[t] > 1 ? `${t}#${seen[t]}` : t; }).join(' > '));
    }
    return L.join('\n');
  }

  return { buildTsl, nameOf, listTemplates: () => FACTORY.map(nameOf), dumpTemplate: n => dumpLines(findFactory(n)), referenceText, TYPES, params, labels, normGuitar };
}
if (typeof module !== 'undefined') module.exports = { createEngine };
