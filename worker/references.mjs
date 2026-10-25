import { documents } from "./site-knowledge.mjs";

const STOP = new Set("a an and are as at be by can do does for from how i in is it me of on or our that the this to us we what when which with you your please tell about have has".split(" "));
function terms(text) {
  return (text.toLowerCase().replace(/\bx64\b/g, "amd64").replace(/\baarch64\b/g, "arm64")
    .match(/[a-z0-9]+/g) || []).filter(word => word.length > 1 && !STOP.has(word));
}

// Small, deployment-time corpus: deterministic lexical retrieval needs no database or embeddings.
const passages = documents.flatMap(doc => {
  const chunks = [];
  let text = "";
  for (const line of doc.text.split("\n")) {
    if (text.length + line.length > 1400 && text) { chunks.push(text); text = ""; }
    for (let offset = 0; offset < line.length; offset += 1400) {
      const part = line.slice(offset, offset + 1400);
      text += (text ? "\n" : "") + part;
      if (text.length >= 1400) { chunks.push(text); text = ""; }
    }
  }
  if (text) chunks.push(text);
  return chunks.map(text => ({ doc, text, words: terms(doc.title + " " + text) }));
});

export function references(question, history = []) {
  const query = [...new Set(terms(question))];
  const previous = new Set(terms(history.filter(item => item.role === "user").slice(-2).map(item => item.content).join(" ")));
  const scored = passages.map((passage, index) => {
    const words = new Set(passage.words);
    let score = 0;
    for (const word of query) {
      if (!words.has(word)) continue;
      const frequency = passages.filter(item => item.words.includes(word)).length;
      score += Math.log(1 + passages.length / (1 + frequency));
      if (terms(passage.doc.title).includes(word)) score += 1;
    }
    if (score > 0) {
      for (const word of previous) if (words.has(word)) score += 0.15;
      if (!passage.doc.date) score *= 1.3;
    }
    return { ...passage, score, index };
  }).filter(item => item.score > 0).sort((a, b) => b.score - a.score || a.index - b.index).slice(0, 8);
  const sources = [];
  const context = scored.filter(item => item.score >= scored[0].score * 0.35).map(item => {
    let id = sources.findIndex(source => source.url === item.doc.url);
    if (id < 0) { id = sources.length; sources.push({ title: item.doc.title, url: item.doc.url, date: item.doc.date }); }
    return `[${id + 1}] ${item.doc.title}\n${item.doc.date ? "HISTORICAL ANNOUNCEMENT dated " + item.doc.date : "Current site page"}\n${item.text}`;
  }).join("\n\n---\n\n");
  return { context, sources };
}
