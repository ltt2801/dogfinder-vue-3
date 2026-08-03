<script setup lang="ts">
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'

import BreedDiscoveryCard from '@/components/breeds/BreedDiscoveryCard.vue'
import BreedDiscoverySkeleton from '@/components/breeds/BreedDiscoverySkeleton.vue'
import BreedDiscoveryState from '@/components/breeds/BreedDiscoveryState.vue'
import type { VoteValue } from '@/config/common'
import { useDogsStore } from '@/stores/dogs'

const dogsStore = useDogsStore()
const {
  images,
  currentImage,
  visibleImages,
  currentBreedInfo,
  hasLoaded,
  isLoading,
  loadError,
  isVoting,
  voteError,
} = storeToRefs(dogsStore)

const vote = (value: VoteValue) => {
  void dogsStore.voteForCurrentImage(value)
}

const getStackStyle = (index: number) => ({
  zIndex: visibleImages.value.length - index,
  ...(index === 0
    ? {}
    : {
        transform: `translateY(${index * 0.55}rem) scale(${1 - index * 0.018})`,
        opacity: 1,
      }),
})

onMounted(() => {
  if (!hasLoaded.value) {
    void dogsStore.loadImages()
  }
})
</script>

<template>
  <section
    class="home-view-section flex h-[calc(100dvh-var(--header-height))] min-h-[48rem] flex-col items-center gap-6 overflow-hidden md:gap-6"
    aria-labelledby="discovery-heading"
  >
    <header class="mx-auto max-w-[34rem] shrink-0 text-center">
      <h1 class="mt-6 my-0 text-base md:text-2xl font-[750] tracking-[0.08em] text-[var(--color-primary-dark)] uppercase">
        Find your new best friend
      </h1>
    </header>

    <div class="flex min-h-0 w-full max-w-[80%] md:w-[40rem] flex-1 flex-col items-center">
      <BreedDiscoverySkeleton
        v-if="isLoading || (!hasLoaded && !loadError)"
        class="h-full w-full"
      />

      <BreedDiscoveryState
        v-else-if="loadError"
        title="We could not fetch the dogs"
        :message="loadError"
        action-label="Try again"
        is-error
        @action="dogsStore.loadImages"
      />

      <template v-else-if="currentImage">
        <div class="relative min-h-0 w-full flex-1 mb-3">
          <BreedDiscoveryCard
            v-for="(image, stackIndex) in visibleImages"
            :key="image.id"
            class="absolute inset-0 min-h-0 w-full"
            :class="{ 'pointer-events-none': stackIndex > 0 }"
            :style="getStackStyle(stackIndex)"
            :image="image"
            :breed-info="stackIndex === 0 ? currentBreedInfo : null"
            :is-voting="isVoting"
            :interactive="stackIndex === 0"
            :allow-details="stackIndex === 0"
            :aria-hidden="stackIndex > 0"
            @vote="stackIndex === 0 && vote($event)"
          />
        </div>
        <p-message
          v-if="voteError"
          class="mt-4 w-full max-w-[28rem]"
          severity="error"
          :closable="false"
          role="alert"
        >
          {{ voteError }}
        </p-message>
      </template>

      <BreedDiscoveryState
        v-else-if="images.length === 0"
        title="No breeds found"
        message="There are no breeds to show right now. Please try loading them again."
        action-label="Reload breeds"
        @action="dogsStore.loadImages"
      />

      <BreedDiscoveryState
        v-else
        title="You met every breed!"
        message="That is the end of this discovery round. Start over whenever you are ready."
        action-label="Start over"
        @action="dogsStore.resetProgress"
      />
    </div>
  </section>
</template>
