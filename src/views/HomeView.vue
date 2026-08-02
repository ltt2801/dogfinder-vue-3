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

onMounted(() => {
  if (!hasLoaded.value) {
    void dogsStore.loadImages()
  }
})
</script>

<template>
  <section
    class="flex h-[calc(100vh-var(--header-height))] min-h-[48rem] flex-col items-center gap-6 overflow-hidden md:gap-6"
    aria-labelledby="discovery-heading"
  >
    <header class="mx-auto max-w-[34rem] shrink-0 text-center">
      <h1 class="mt-3 mb-0 font-[750] tracking-[0.08em] text-[var(--color-primary-dark)] uppercase">
        Find your new best friend
      </h1>
    </header>

    <div class="flex min-h-0 w-full max-w-[95%] md:w-[40rem] flex-1 flex-col items-center">
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
        <BreedDiscoveryCard
          :key="currentImage.id"
          class="min-h-0 w-full flex-1"
          :image="currentImage"
          :breed-info="currentBreedInfo"
          :is-voting="isVoting"
          @vote="vote"
        />
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
