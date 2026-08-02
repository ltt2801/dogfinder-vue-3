<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import BreedDiscoveryState from '@/components/breeds/BreedDiscoveryState.vue'
import type { DogBreed } from '@/models/dog'
import { dogApi } from '@/services/dogApi'
import IconArrowLeft from '~icons/lucide/arrow-left'

const props = defineProps<{
  id: string
}>()

const breed = ref<DogBreed | null>(null)
const isLoading = ref(false)
const hasLoaded = ref(false)
const loadError = ref<string | null>(null)

const breedId = computed(() => {
  if (!/^\d+$/.test(props.id)) {
    return null
  }

  const parsedId = Number(props.id)
  return Number.isSafeInteger(parsedId) && parsedId > 0 ? parsedId : null
})
const image = computed(() => breed.value?.image)
const isInitialLoading = computed(
  () => breedId.value !== null && (isLoading.value || (!hasLoaded.value && !loadError.value)),
)
const showNotFound = computed(
  () => breedId.value === null || (hasLoaded.value && !breed.value && !isLoading.value),
)

const detailFields = computed(() => {
  const selectedBreed = breed.value

  return [
    { label: 'Weight', value: selectedBreed?.weight?.metric, unit: 'kg' },
    { label: 'Height', value: selectedBreed?.height?.metric, unit: 'cm' },
    { label: 'Bred for', value: selectedBreed?.bred_for },
    { label: 'Breed group', value: selectedBreed?.breed_group },
    { label: 'Life span', value: selectedBreed?.life_span },
    { label: 'Temperament', value: selectedBreed?.temperament },
  ]
})

const loadBreed = async () => {
  const id = breedId.value
  if (id === null || isLoading.value) {
    return
  }

  isLoading.value = true
  loadError.value = null

  try {
    const breedInfo = await dogApi.getInfoByBreedId(id)
    const normalizedId = Number(breedInfo?.id)

    breed.value =
      Number.isSafeInteger(normalizedId) && normalizedId > 0 && typeof breedInfo?.name === 'string'
        ? { ...breedInfo, id: normalizedId }
        : null
    hasLoaded.value = true
  } catch (error) {
    breed.value = null
    const status =
      typeof error === 'object' && error !== null && 'status' in error
        ? Number(error.status)
        : undefined

    if (status === 404) {
      hasLoaded.value = true
    } else {
      loadError.value = error instanceof Error ? error.message : 'An unexpected error occurred.'
    }
  } finally {
    isLoading.value = false
  }
}

onMounted(loadBreed)
</script>

<template>
  <section class="mx-auto w-full max-w-[68rem]" aria-label="Breed details">
    <RouterLink
      class="mb-6 inline-flex items-center gap-2 font-bold text-[var(--color-primary-dark)] underline-offset-4 min-[52rem]:mb-8"
      to="/"
      aria-label="Back to breed discovery"
    >
      <IconArrowLeft class="w-4 h-4 mt-0.5" />
      Back to Home
    </RouterLink>

    <div
      v-if="isInitialLoading"
      class="grid overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] min-[52rem]:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)]"
      role="status"
      aria-label="Loading breed details"
    >
      <p-skeleton class="!h-80 !rounded-none min-[52rem]:!h-full min-[52rem]:min-h-[38rem]" />
      <div class="grid gap-4 p-[clamp(1.5rem,5vw,3rem)]">
        <p-skeleton width="45%" height="1rem" />
        <p-skeleton width="75%" height="3rem" />
        <p-skeleton v-for="index in 6" :key="index" width="100%" height="3.5rem" />
      </div>
    </div>

    <BreedDiscoveryState
      v-else-if="loadError"
      title="We could not load this breed"
      :message="loadError"
      action-label="Try again"
      is-error
      @action="loadBreed"
    />

    <BreedDiscoveryState
      v-else-if="showNotFound"
      title="Breed not found"
      message="This breed does not exist or is no longer available."
      action-label="Browse breeds"
      @action="$router.push('/')"
    />

    <article
      v-else-if="breed"
      class="overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] min-[52rem]:grid min-[52rem]:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)]"
    >
      <div class="min-h-76 bg-stone-300 min-[52rem]:min-h-[38rem]">
        <img
          v-if="image?.url"
          :src="image.url"
          :alt="`${breed.name} dog`"
          class="h-[clamp(19rem,58vw,34rem)] w-full object-contain object-center min-[52rem]:h-full min-[52rem]:min-h-[38rem]"
        />
        <div
          v-else
          class="grid min-h-76 place-content-center gap-3 text-center text-[var(--color-text-muted)] min-[52rem]:h-full min-[52rem]:min-h-[38rem]"
          role="img"
          :aria-label="`${breed.name}`"
        >
          <span class="text-5xl" aria-hidden="true">🐾</span>
          <span>No image available</span>
        </div>
      </div>

      <div class="p-[clamp(1.5rem,5vw,3rem)] min-[52rem]:self-center">
        <p
          class="mt-0 mb-2 text-[0.8rem] font-extrabold tracking-[0.1em] text-[var(--color-primary-dark)] uppercase"
        >
          Breed profile
        </p>
        <h1
          id="details-heading"
          class="m-0 text-[clamp(2rem,6vw,3.5rem)] leading-[1.05] tracking-[-0.045em]"
        >
          {{ breed.name }}
        </h1>

        <dl class="mt-8 mb-0 grid">
          <div
            v-for="field in detailFields"
            :key="field.label"
            class="grid gap-1 border-t border-[var(--color-border)] py-4"
          >
            <dt
              class="text-[0.8rem] font-[750] tracking-[0.06em] text-[var(--color-text-muted)] uppercase"
            >
              {{ field.label }}
            </dt>
            <dd class="m-0 leading-[1.55]">
              {{ field.value || 'Not available' }}
              <span v-if="field.value && field.unit">{{ field.unit }}</span>
            </dd>
          </div>
        </dl>
      </div>
    </article>
  </section>
</template>
