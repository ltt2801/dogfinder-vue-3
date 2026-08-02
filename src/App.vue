<script setup lang="ts">
import { storeToRefs } from 'pinia'

import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const { user } = storeToRefs(userStore)

userStore.initializeUser()
</script>

<template>
  <div class="app-shell">
    <a class="skip-link" href="#main-content">Skip to main content</a>

    <header class="app-header">
      <RouterLink class="brand" to="/" aria-label="DogFinder home">
        <span class="brand-mark" aria-hidden="true">🐾</span>
        <span class="brand-name">DogFinder</span>
      </RouterLink>

      <div v-if="user" class="user-profile" aria-label="Current user">
        <img class="user-profile__avatar" :src="user.avatarBase64" alt="" />
        <div class="user-profile__details">
          <strong class="user-profile__name">{{ user.fullName }}</strong>
          <span class="user-profile__id" :title="user.subId">ID: {{ user.subId }}</span>
        </div>
      </div>
    </header>

    <main id="main-content" class="app-main" tabindex="-1">
      <RouterView />
    </main>

    <div
      id="app-notifications"
      class="notification-region"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      tabindex="-1"
    ></div>
  </div>
</template>
