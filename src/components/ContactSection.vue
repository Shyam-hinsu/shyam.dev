<script setup>
import { ref, reactive, computed } from 'vue'
import { site } from '../content/site.js'
import { contact } from '../content/contact.js'
import { useReveal } from '../composables/useReveal.js'
import SectionHeading from './SectionHeading.vue'
import IconGlyph from './IconGlyph.vue'

const root = ref(null)
useReveal(root)

/**
 * The form is rendered only when it can actually deliver a message:
 * - with `site.contactForm.endpoint` it POSTs JSON to that backend;
 * - otherwise, with `site.email` set, it composes a pre-filled email (mailto:).
 * With neither configured the form is hidden rather than left non-functional.
 */
const endpoint = site.contactForm.endpoint
const hasForm = computed(() => Boolean(endpoint || site.email))
const deliveryMode = endpoint ? 'endpoint' : 'mailto'

const form = reactive({ name: '', email: '', message: '', website: '' /* honeypot */ })
const errors = reactive({ name: '', email: '', message: '' })
const state = ref('idle') // idle | sending | sent | error
const touched = reactive({ name: false, email: false, message: false })

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function validate() {
  errors.name = form.name.trim().length < 2 ? 'Please enter your name.' : ''
  errors.email = !EMAIL_RE.test(form.email.trim()) ? 'Please enter a valid email address.' : ''
  errors.message = form.message.trim().length < 20 ? 'Please write at least 20 characters.' : ''
  return !errors.name && !errors.email && !errors.message
}

function onBlur(field) {
  touched[field] = true
  validate()
}

async function submit() {
  touched.name = touched.email = touched.message = true
  if (!validate()) {
    const firstInvalid = root.value?.querySelector('[aria-invalid="true"]')
    firstInvalid?.focus()
    return
  }
  if (form.website) return // bot filled the honeypot; silently ignore

  if (deliveryMode === 'mailto') {
    const subject = encodeURIComponent(`Portfolio message from ${form.name.trim()}`)
    const body = encodeURIComponent(`${form.message.trim()}\n\n— ${form.name.trim()} (${form.email.trim()})`)
    window.location.href = `mailto:${site.email}?subject=${subject}&body=${body}`
    state.value = 'sent'
    return
  }

  state.value = 'sending'
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ name: form.name.trim(), email: form.email.trim(), message: form.message.trim() }),
    })
    if (!res.ok) throw new Error(`Request failed with status ${res.status}`)
    state.value = 'sent'
    form.name = form.email = form.message = ''
    touched.name = touched.email = touched.message = false
  } catch {
    state.value = 'error'
  }
}
</script>

<template>
  <section id="contact" ref="root" class="section contact" aria-labelledby="contact-title" data-agent-section="contact">
    <div class="container">
      <SectionHeading id="contact-title" :eyebrow="contact.eyebrow" :title="contact.title">
        {{ contact.text }}
      </SectionHeading>

      <div class="contact__grid">
        <ul class="contact__channels" data-agent-element data-agent-handle="s">
          <li v-if="site.email" class="reveal">
            <a class="channel" :href="`mailto:${site.email}`">
              <span class="channel__icon"><IconGlyph name="mail" /></span>
              <span class="channel__body">
                <span class="channel__label mono">Email</span>
                <span class="channel__value">{{ site.email }}</span>
              </span>
              <IconGlyph name="arrow-up-right" />
            </a>
          </li>
          <li v-if="site.links.linkedin" class="reveal" style="--reveal-delay: 60ms">
            <a class="channel" :href="site.links.linkedin" target="_blank" rel="noopener noreferrer">
              <span class="channel__icon"><IconGlyph name="linkedin" /></span>
              <span class="channel__body">
                <span class="channel__label mono">LinkedIn</span>
                <span class="channel__value">{{ site.links.linkedin.replace(/^https?:\/\/(www\.)?/, '') }}</span>
              </span>
              <IconGlyph name="arrow-up-right" />
            </a>
          </li>
          <li v-if="site.links.github" class="reveal" style="--reveal-delay: 120ms">
            <a class="channel" :href="site.links.github" target="_blank" rel="noopener noreferrer">
              <span class="channel__icon"><IconGlyph name="github" /></span>
              <span class="channel__body">
                <span class="channel__label mono">GitHub</span>
                <span class="channel__value">{{ site.links.github.replace(/^https?:\/\/(www\.)?/, '') }}</span>
              </span>
              <IconGlyph name="arrow-up-right" />
            </a>
          </li>
          <li v-if="site.resumeUrl" class="reveal" style="--reveal-delay: 180ms">
            <a class="channel" :href="site.resumeUrl" download>
              <span class="channel__icon"><IconGlyph name="download" /></span>
              <span class="channel__body">
                <span class="channel__label mono">Resume</span>
                <span class="channel__value">Download PDF</span>
              </span>
              <IconGlyph name="arrow-up-right" />
            </a>
          </li>
        </ul>

        <form v-if="hasForm" class="form card reveal" style="--reveal-delay: 120ms" novalidate data-agent-element data-agent-handle="se" @submit.prevent="submit">
          <h3 class="form__title">{{ contact.formTitle }}</h3>

          <div class="field">
            <label for="cf-name">Name</label>
            <input
              id="cf-name"
              v-model="form.name"
              type="text"
              name="name"
              autocomplete="name"
              required
              :aria-invalid="touched.name && errors.name ? 'true' : null"
              :aria-describedby="touched.name && errors.name ? 'cf-name-err' : null"
              @blur="onBlur('name')"
            />
            <p v-if="touched.name && errors.name" id="cf-name-err" class="field__error" role="alert">{{ errors.name }}</p>
          </div>

          <div class="field">
            <label for="cf-email">Email</label>
            <input
              id="cf-email"
              v-model="form.email"
              type="email"
              name="email"
              autocomplete="email"
              inputmode="email"
              required
              :aria-invalid="touched.email && errors.email ? 'true' : null"
              :aria-describedby="touched.email && errors.email ? 'cf-email-err' : null"
              @blur="onBlur('email')"
            />
            <p v-if="touched.email && errors.email" id="cf-email-err" class="field__error" role="alert">{{ errors.email }}</p>
          </div>

          <div class="field">
            <label for="cf-message">Message</label>
            <textarea
              id="cf-message"
              v-model="form.message"
              name="message"
              rows="5"
              required
              minlength="20"
              :aria-invalid="touched.message && errors.message ? 'true' : null"
              :aria-describedby="touched.message && errors.message ? 'cf-message-err' : null"
              @blur="onBlur('message')"
            />
            <p v-if="touched.message && errors.message" id="cf-message-err" class="field__error" role="alert">{{ errors.message }}</p>
          </div>

          <!-- Honeypot: hidden from people, filled by bots. -->
          <div class="field field--hp" aria-hidden="true">
            <label for="cf-website">Website</label>
            <input id="cf-website" v-model="form.website" type="text" name="website" tabindex="-1" autocomplete="off" />
          </div>

          <div class="form__actions">
            <button type="submit" class="btn btn--primary" :disabled="state === 'sending'">
              {{ state === 'sending' ? 'Sending…' : deliveryMode === 'mailto' ? 'Open in your email app' : 'Send message' }}
              <IconGlyph name="arrow-right" />
            </button>
            <p v-if="state === 'sent'" class="form__status form__status--ok" role="status">
              <IconGlyph name="check" />
              {{ deliveryMode === 'mailto' ? 'Your email app should open with the message pre-filled.' : 'Thanks, your message has been sent.' }}
            </p>
            <p v-else-if="state === 'error'" class="form__status form__status--err" role="alert">
              Something went wrong. Please email me directly instead.
            </p>
          </div>
        </form>

        <div v-else class="form card reveal contact__fallback" style="--reveal-delay: 120ms" data-agent-element data-agent-handle="se">
          <h3 class="form__title">{{ contact.formTitle }}</h3>
          <p class="muted">
            The contact form switches on once an email address or a form endpoint is configured in
            <code>src/content/site.js</code>. Until then, the channels on the left are the way to reach me.
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.contact__grid {
  display: grid;
  gap: var(--s-6);
}
.contact__channels {
  display: grid;
  gap: var(--s-3);
  align-content: start;
}
.channel {
  display: flex;
  align-items: center;
  gap: var(--s-4);
  padding: var(--s-4);
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  transition: border-color var(--dur-fast), background-color var(--dur-fast), transform var(--dur) var(--ease-out);
}
.channel:hover {
  border-color: var(--line-strong);
  background: rgba(255, 255, 255, 0.03);
  transform: translateX(4px);
}
.channel > svg {
  width: 1rem;
  height: 1rem;
  margin-left: auto;
  color: var(--ink-3);
}
.channel__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent-hot);
  flex: none;
}
.channel__icon svg {
  width: 1.1rem;
  height: 1.1rem;
}
.channel__body {
  display: grid;
  gap: 0.1rem;
  min-width: 0;
}
.channel__label {
  font-size: 0.65rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.channel__value {
  font-weight: 500;
  overflow-wrap: anywhere;
}
.form {
  padding: var(--s-5);
  display: grid;
  gap: var(--s-4);
}
.form__title {
  font-family: var(--font-display);
  font-weight: 400;
  font-size: var(--text-xl);
}
.field {
  display: grid;
  gap: 0.4rem;
}
.field label {
  font-size: var(--text-sm);
  font-weight: 500;
}
.field input,
.field textarea {
  width: 100%;
  padding: 0.8rem 0.95rem;
  background: var(--bg);
  border: 1px solid var(--line-strong);
  border-radius: var(--r-sm);
  color: var(--ink);
  transition: border-color var(--dur-fast);
}
.field textarea {
  resize: vertical;
  min-height: 8rem;
}
.field input:focus,
.field textarea:focus {
  outline: none;
  border-color: var(--accent-hot);
  box-shadow: 0 0 0 3px var(--accent-soft);
}
.field [aria-invalid='true'] {
  border-color: var(--accent);
}
.field__error {
  font-size: 0.8rem;
  color: var(--accent-hot);
}
.field--hp {
  position: absolute;
  left: -10000px;
  width: 1px;
  height: 1px;
  overflow: hidden;
}
.form__actions {
  display: grid;
  gap: var(--s-3);
}
.form__status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: var(--text-sm);
}
.form__status svg {
  width: 1rem;
  height: 1rem;
}
.form__status--ok {
  color: var(--ok);
}
.form__status--err {
  color: var(--accent-hot);
}
.contact__fallback code {
  color: var(--ink-2);
}
@media (min-width: 64em) {
  .contact__grid {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
    gap: var(--s-8);
  }
}
</style>
