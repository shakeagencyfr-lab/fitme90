// Codemod i18n complémentaire : textes issus de tableaux de données
// (MARQUEE, FEATURES, FAQ, tableaux inline dans un .map) rendus via {t} / {x.title}.
// 1) collecte les chaînes françaises des tableaux/objets littéraux ;
// 2) enveloppe les expressions JSX {ident} / {ident.prop} issues d'un .map(…)
//    sur un tableau statique dans tx(…).
// Usage : node scripts/i18n-codemod-data.mjs [--write] [--phrases out.json] fichiers…
import ts from "typescript";
import fs from "node:fs";

const args = process.argv.slice(2);
const write = args.includes("--write");
const phrasesIdx = args.indexOf("--phrases");
const phrasesOut = phrasesIdx >= 0 ? args[phrasesIdx + 1] : null;
const files = args.filter((a, i) => !a.startsWith("--") && !(phrasesIdx >= 0 && i === phrasesIdx + 1));

const SKIP_PROPS = new Set(["icon", "kind", "n", "href", "key", "id", "color", "pos", "className", "cls", "hi"]);
const TEXT_PROPS = new Set(["title", "desc", "label", "q", "a", "tag", "t", "d", "text", "name", "points", "sub", "k", "v", "chunk"]);
const hasLetters = (t) => /[A-Za-zÀ-ÿ]{2,}/.test(t);
const looksFrench = (t) => hasLetters(t) && !/^[A-Z0-9_./:#-]+$/.test(t.trim()) && !/^#/.test(t) && t.trim().length > 2;
const phrases = new Set();
const isStaticName = (name) => /^[A-Z][A-Z0-9_]+$/.test(name);

function processFile(file) {
  const src = fs.readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const edits = [];
  const tracked = new Set(); // identifiants (paramètres de .map) considérés « données statiques »

  // 1) Collecte des chaînes dans les tableaux littéraux.
  function collect(node) {
    if (ts.isArrayLiteralExpression(node)) {
      for (const el of node.elements) collectValue(el);
    }
    ts.forEachChild(node, collect);
  }
  function collectValue(el) {
    if (ts.isStringLiteral(el) || ts.isNoSubstitutionTemplateLiteral(el)) {
      if (looksFrench(el.text)) phrases.add(el.text);
    } else if (ts.isObjectLiteralExpression(el)) {
      for (const p of el.properties) {
        if (!ts.isPropertyAssignment(p)) continue;
        const name = p.name.getText();
        if (SKIP_PROPS.has(name)) continue;
        if (ts.isStringLiteral(p.initializer)) { if (looksFrench(p.initializer.text)) phrases.add(p.initializer.text); }
        else if (ts.isArrayLiteralExpression(p.initializer)) p.initializer.elements.forEach(collectValue);
      }
    } else if (ts.isArrayLiteralExpression(el)) {
      el.elements.forEach(collectValue);
    }
  }
  collect(sf);

  // 2) Suivi des paramètres de .map sur des sources statiques.
  function isStaticSource(expr) {
    if (ts.isArrayLiteralExpression(expr)) return true;
    if (ts.isIdentifier(expr)) return isStaticName(expr.text);
    if (ts.isPropertyAccessExpression(expr)) return (ts.isIdentifier(expr.expression) && tracked.has(expr.expression.text)) || isStaticSource(expr.expression);
    if (ts.isParenthesizedExpression(expr)) return isStaticSource(expr.expression);
    return false;
  }
  function trackBinding(b) {
    if (ts.isIdentifier(b)) tracked.add(b.text);
    else if (ts.isArrayBindingPattern(b) || ts.isObjectBindingPattern(b)) for (const e of b.elements) if (ts.isBindingElement(e)) trackBinding(e.name);
  }
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === "map" && isStaticSource(node.expression.expression)) {
      const cb = node.arguments[0];
      if (cb && (ts.isArrowFunction(cb) || ts.isFunctionExpression(cb)) && cb.parameters[0]) trackBinding(cb.parameters[0].name);
    }
    if (ts.isJsxExpression(node) && node.expression && ts.isJsxElement(node.parent)) {
      const e = node.expression;
      let wrap = false;
      if (ts.isIdentifier(e) && tracked.has(e.text) && !/^(i|_|idx|index|n)$/.test(e.text)) wrap = true;
      if (ts.isPropertyAccessExpression(e) && ts.isIdentifier(e.expression) && tracked.has(e.expression.text) && TEXT_PROPS.has(e.name.text)) wrap = true;
      if (wrap) edits.push({ start: e.getStart(), end: e.getEnd(), text: `tx(${e.getText()})` });
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);

  let out = src;
  for (const e of edits.sort((a, b) => b.start - a.start)) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  if (write && edits.length) fs.writeFileSync(file, out);
  return { file, count: edits.length };
}

const results = files.map(processFile);
for (const r of results) console.log(`${r.count}\t${r.file}`);
if (phrasesOut) fs.writeFileSync(phrasesOut, JSON.stringify([...phrases], null, 2));
console.log(`${phrases.size} phrases`);
