<script setup>
defineProps({
  eyebrow: { type: String, required: true },
  title: { type: String, required: true },
  id: { type: String, required: true },
})
</script>

<template>
  <div class="section-head">
    <div>
      <p class="eyebrow reveal">{{ eyebrow }}</p>
      <!-- Titles come from the content config and may contain <em> for the accent word. -->
      <h2 :id="id" class="display section-head__title reveal" style="--reveal-delay: 60ms" v-html="title" />
    </div>
    <div v-if="$slots.default" class="section-head__aside lede reveal" style="--reveal-delay: 120ms">
      <slot />
    </div>
  </div>
</template>
