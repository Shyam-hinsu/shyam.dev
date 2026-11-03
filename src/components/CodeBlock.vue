<script setup>
import { computed } from 'vue'

/**
 * Dependency-free syntax highlighting for the JavaScript excerpts in the
 * engineering showcase. A single-pass tokenizer is enough for short samples.
 */
const props = defineProps({
  source: { type: String, required: true },
  filename: { type: String, default: '' },
})

const KEYWORDS = new Set([
  'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'new', 'import',
  'export', 'from', 'async', 'await', 'try', 'catch', 'finally', 'true', 'false', 'null',
  'undefined', 'this', 'of', 'in', 'class', 'default', 'switch', 'case', 'break',
])

const TOKEN_RE =
  /(\/\/.*$)|(`(?:\\.|[^`])*`|'(?:\\.|[^'])*'|"(?:\\.|[^"])*")|(\b\d[\d_]*(?:\.\d+)?\b)|(\b[A-Za-z_$][\w$]*\b)(?=\s*\()|(\b[A-Za-z_$][\w$]*\b)|([{}()[\].,;=+\-*/<>!&|?:])/gm

function escape(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const html = computed(() => {
  let out = ''
  let last = 0
  const src = props.source
  for (const m of src.matchAll(TOKEN_RE)) {
    out += escape(src.slice(last, m.index))
    const [raw, comment, str, num, call, ident, punct] = m
    if (comment) out += `<span class="tk-c">${escape(raw)}</span>`
    else if (str) out += `<span class="tk-s">${escape(raw)}</span>`
    else if (num) out += `<span class="tk-n">${escape(raw)}</span>`
    else if (call) out += `<span class="${KEYWORDS.has(call) ? 'tk-k' : 'tk-f'}">${escape(raw)}</span>`
    else if (ident) out += `<span class="${KEYWORDS.has(ident) ? 'tk-k' : 'tk-i'}">${escape(raw)}</span>`
    else if (punct) out += `<span class="tk-p">${escape(raw)}</span>`
    last = m.index + raw.length
  }
  out += escape(src.slice(last))
  return out
})
</script>

<template>
  <figure class="code">
    <figcaption v-if="filename" class="code__bar">
      <span class="code__dots" aria-hidden="true"><i /><i /><i /></span>
      <span class="code__name">{{ filename }}</span>
    </figcaption>
    <pre class="code__pre" tabindex="0"><code v-html="html" /></pre>
  </figure>
</template>

<style scoped>
.code {
  min-width: 0;
  max-width: 100%;
  background: #0d0d10;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  overflow: hidden;
}
.code__bar {
  display: flex;
  align-items: center;
  gap: var(--s-3);
  padding: 0.6rem 0.9rem;
  border-bottom: 1px solid var(--line);
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: var(--ink-3);
}
.code__dots {
  display: inline-flex;
  gap: 5px;
}
.code__dots i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--ink-4);
}
.code__dots i:first-child {
  background: var(--accent);
}
.code__pre {
  margin: 0;
  padding: 1rem 1.1rem 1.2rem;
  overflow-x: auto;
  font-size: 0.8rem;
  line-height: 1.6;
  color: #d6d3cc;
  tab-size: 2;
}
.code__pre:focus-visible {
  outline-offset: -2px;
}
.code :deep(.tk-c) { color: #6f6d68; font-style: italic; }
.code :deep(.tk-s) { color: #e9b872; }
.code :deep(.tk-n) { color: #f0a4ab; }
.code :deep(.tk-k) { color: #ff7a85; }
.code :deep(.tk-f) { color: #9ad0ff; }
.code :deep(.tk-i) { color: #d6d3cc; }
.code :deep(.tk-p) { color: #8e8b85; }
</style>
