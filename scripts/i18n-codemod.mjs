// Codemod i18n « par phrases » : enveloppe les textes JSX et attributs textuels
// en français dans p("…") (client : usePhrase(), serveur : p importé).
// Usage : node scripts/i18n-codemod.mjs [--write] [--phrases out.json] fichiers…
import ts from "typescript";
import fs from "node:fs";

const args = process.argv.slice(2);
const write = args.includes("--write");
const phrasesIdx = args.indexOf("--phrases");
const phrasesOut = phrasesIdx >= 0 ? args[phrasesIdx + 1] : null;
const files = args.filter((a, i) => !a.startsWith("--") && !(phrasesIdx >= 0 && i === phrasesIdx + 1));

const TEXT_ATTRS = new Set(["label", "placeholder", "title", "aria-label", "help", "hint", "desc", "description", "sub", "submitLabel", "emptyHint", "alt", "namePlaceholder", "priceLabel", "eyebrow", "value"]);
const SKIP_ATTR_VALUE = /^(fr|en|on|off|submit|button|text|email|password|number|date|tel|url|checkbox|radio|hidden|file|search|color|month|GET|POST|_blank|noreferrer|noopener nofollow|none|manual|decimal|numeric)$/;
const hasLetters = (t) => /[A-Za-zÀ-ÿ]{2,}/.test(t);
const looksFrench = (t) => hasLetters(t) && !/^[A-Z0-9_./:-]+$/.test(t.trim());
const phrases = new Set();

function norm(text) {
  // Espaces multiples / retours à la ligne des JsxText → un espace.
  return text.replace(/\s+/g, " ").trim();
}

function processFile(file) {
  const src = fs.readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const isClient = /^\s*(\/\*[\s\S]*?\*\/\s*)?["']use client["']/.test(src);
  const edits = [];

  function visit(node) {
    if (ts.isJsxText(node)) {
      const raw = node.getText();
      const text = norm(raw);
      if (text && looksFrench(text) && !/\{|\}/.test(text)) {
        // Conserve les blancs de bord (séparation avec les nœuds voisins).
        const lead = /^\s*\n/.test(raw) ? "" : /^\s/.test(raw) ? " " : "";
        const trail = /\n\s*$/.test(raw) ? "" : /\s$/.test(raw) ? " " : "";
        const decoded = text.replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&nbsp;/g, " ");
        phrases.add(decoded);
        edits.push({ start: node.getStart(), end: node.getEnd(), text: `${lead}{tx(${JSON.stringify(decoded)})}${trail}` });
      }
    } else if (ts.isJsxAttribute(node) && node.initializer && ts.isStringLiteral(node.initializer)) {
      const name = node.name.getText();
      const val = node.initializer.text;
      if (TEXT_ATTRS.has(name) && looksFrench(val) && !SKIP_ATTR_VALUE.test(val) && val.length > 2) {
        phrases.add(val);
        edits.push({ start: node.initializer.getStart(), end: node.initializer.getEnd(), text: `{tx(${JSON.stringify(val)})}` });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  if (!edits.length) return { file, count: 0 };

  let out = src;
  for (const e of edits.sort((a, b) => b.start - a.start)) out = out.slice(0, e.start) + e.text + out.slice(e.end);

  // Injection de `p` : client → hook dans chaque composant ; serveur → import.
  if (isClient) {
    const sf2 = ts.createSourceFile(file, out, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const inserts = [];
    function needsP(fn) {
      let uses = false;
      const walk = (n) => { if (uses) return; if (ts.isCallExpression(n) && n.expression.getText() === "tx") uses = true; ts.forEachChild(n, walk); };
      walk(fn);
      return uses;
    }
    function bodyStart(fn) { return fn.body && ts.isBlock(fn.body) ? fn.body.getStart() + 1 : -1; }
    for (const st of sf2.statements) {
      if (ts.isFunctionDeclaration(st) && st.body && needsP(st)) inserts.push(bodyStart(st));
      if (ts.isVariableStatement(st)) {
        for (const d of st.declarationList.declarations) {
          if (d.initializer && (ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer)) && needsP(d.initializer)) {
            const bs = bodyStart(d.initializer);
            if (bs > 0) inserts.push(bs);
          }
        }
      }
    }
    for (const pos of inserts.sort((a, b) => b - a)) out = out.slice(0, pos) + "\n  const tx = usePhrase();" + out.slice(pos);
    if (!/from "@\/components\/locale-provider"/.test(out)) {
      out = out.replace(/(["']use client["'];\n)/, `$1\nimport { usePhrase } from "@/components/locale-provider";\n`);
    } else if (!/usePhrase/.test(out)) {
      out = out.replace(/import \{([^}]*)\} from "@\/components\/locale-provider";/, (m, inner) => `import {${inner.trim() ? inner.replace(/\s*$/, "") + ", " : " "}usePhrase } from "@/components/locale-provider";`);
    }
  } else if (!/from "@\/lib\/i18n\/request"/.test(out)) {
    const m = out.match(/^import [^\n]+\n/m);
    const line = 'import { tx } from "@/lib/i18n/request";\n';
    out = m ? out.slice(0, m.index + m[0].length) + line + out.slice(m.index + m[0].length) : line + out;
  }
  if (write) fs.writeFileSync(file, out);
  return { file, count: edits.length };
}

let total = 0;
for (const f of files) {
  const r = processFile(f);
  total += r.count;
  if (r.count) console.log(`${r.count}\t${r.file}`);
}
console.log(`TOTAL edits ${total}, distinct phrases ${phrases.size}`);
if (phrasesOut) fs.writeFileSync(phrasesOut, JSON.stringify([...phrases].sort(), null, 1));
