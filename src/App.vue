<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { onClickOutside } from '@vueuse/core'
import IconChevronDown from '~icons/lucide/chevron-down'
import IconHistory from '~icons/lucide/history'

import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const { user } = storeToRefs(userStore)
const userMenu = ref<HTMLElement | null>(null)
const isUserMenuOpen = ref(false)

userStore.initializeUser()

onClickOutside(userMenu, () => {
  isUserMenuOpen.value = false
})

const toggleUserMenu = async () => {
  isUserMenuOpen.value = !isUserMenuOpen.value

  if (isUserMenuOpen.value) {
    await nextTick()
    userMenu.value?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
  }
}

const closeUserMenu = () => {
  isUserMenuOpen.value = false
}
</script>

<template>
  <div class="app-shell">
    <a class="skip-link" href="#main-content">Skip to main content</a>

    <header class="app-header">
      <RouterLink class="brand" to="/" aria-label="DogFinder home">
        <span class="brand-mark" aria-hidden="true">🐾</span>
        <span class="brand-name">DogFinder</span>
      </RouterLink>

      <div
        v-if="user"
        ref="userMenu"
        class="relative ml-auto"
        @keydown.esc.stop="closeUserMenu"
      >
        <button
          type="button"
          class="user-profile !ml-0 min-h-11 cursor-pointer rounded-full border-0 bg-transparent p-1.5 text-left hover:bg-black/5"
          aria-label="Open user menu"
          aria-haspopup="menu"
          :aria-expanded="isUserMenuOpen"
          @click="toggleUserMenu"
        >
          <img class="user-profile__avatar" :src="user.avatarBase64" alt="" />
          <div class="user-profile__details !hidden min-[30rem]:!grid">
            <strong class="user-profile__name">{{ user.fullName }}</strong>
            <span class="user-profile__id" :title="user.subId">ID: {{ user.subId }}</span>
          </div>
          <IconChevronDown
            class="h-4 w-4 shrink-0 transition-transform"
            :class="{ 'rotate-180': isUserMenuOpen }"
            aria-hidden="true"
          />
        </button>

        <div
          v-if="isUserMenuOpen"
          class="absolute top-[calc(100%+0.5rem)] right-0 z-50 w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-xl"
          role="menu"
          aria-label="User menu"
        >
          <div class="border-b border-[var(--color-border)] px-3 py-2 min-[30rem]:hidden">
            <strong class="block truncate text-sm">{{ user.fullName }}</strong>
            <span class="block truncate text-xs text-[var(--color-text-muted)]">
              ID: {{ user.subId }}
            </span>
          </div>

          <RouterLink
            class="user-menu-item flex min-h-12 items-center gap-3 rounded-xl px-3 py-2 font-bold text-[var(--color-primary-dark)] no-underline hover:bg-black/5"
            to="/history"
            role="menuitem"
            @click="closeUserMenu"
          >
            <IconHistory class="h-5 w-5 shrink-0" aria-hidden="true" />
            Vote history
          </RouterLink>
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

<style lang="css">
.user-menu-item:focus-visible {
  outline: none;
}
</style>