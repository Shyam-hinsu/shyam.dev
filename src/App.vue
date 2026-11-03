<script setup>
import { ref } from 'vue'
import SiteNav from './components/SiteNav.vue'
import HeroSection from './components/HeroSection.vue'
import AboutSection from './components/AboutSection.vue'
import ProjectsSection from './components/ProjectsSection.vue'
import ShowcaseSection from './components/ShowcaseSection.vue'
import ExpertiseSection from './components/ExpertiseSection.vue'
import ExperienceSection from './components/ExperienceSection.vue'
import PhilosophySection from './components/PhilosophySection.vue'
import AchievementsSection from './components/AchievementsSection.vue'
import BeyondSection from './components/BeyondSection.vue'
import ContactSection from './components/ContactSection.vue'
import SiteFooter from './components/SiteFooter.vue'
import AgentOverlay from './components/AgentOverlay.vue'

const overlay = ref(null)
</script>

<template>
  <SiteNav />
  <main id="main">
    <HeroSection />
    <AboutSection />
    <ProjectsSection />
    <ShowcaseSection />
    <ExpertiseSection />
    <ExperienceSection />
    <PhilosophySection />
    <AchievementsSection />
    <BeyondSection />
    <ContactSection @gather="overlay?.gather()" />
  </main>
  <SiteFooter />
  <AgentOverlay ref="overlay" />
</template>
