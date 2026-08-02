<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import IconCheck from '~icons/lucide/check'
import IconClose from '~icons/lucide/x'
import IconInfo from '~icons/lucide/info'
import IconStar from '~icons/lucide/star'

import { useSwipe } from '@/composables/useSwipe'
import type { DogBreed, DogImage } from '@/models/dog'
import { VoteValueEnum } from '@/config/enum'
import type { VoteValue } from '@/config/common'

const props = defineProps<{
  image: DogImage
  breedInfo?: DogBreed | null
  isVoting: boolean
}>()

const emit = defineEmits<{
  vote: [value: VoteValue]
}>()

const showDetails = ref(false)
const breed = computed(() => props.breedInfo ?? props.image.breeds?.[0])
const breedName = computed(() => breed.value?.name ?? 'Unknown breed')

watch(
  () => props.image.id,
  () => {
    showDetails.value = false
  },
)

const detailFields = computed(() => [
  { label: 'Breed Name', value: breed.value?.name },
  { label: 'Breed For', value: breed.value?.bred_for },
  {
    label: 'Weight & Height',
    value:
      breed.value?.weight?.metric && breed.value.height?.metric
        ? `${breed.value.weight.metric} kg - ${breed.value.height.metric} cm`
        : undefined,
  },
  { label: 'Breed Group', value: breed.value?.breed_group },
  { label: 'Temperament', value: breed.value?.temperament },
  { label: 'Life Span', value: breed.value?.life_span },
])

const toggleDetails = () => {
  showDetails.value = !showDetails.value
}

const closeDetails = () => {
  showDetails.value = false
}

const onCardClick = (event: MouseEvent) => {
  const target = event.target

  if (target instanceof Element && target.closest('[data-vote-action], [data-card-action]')) {
    return
  }

  toggleDetails()
}

const isSwipeDisabled = computed(() => props.isVoting)
const {
  cardStyle,
  feedback,
  isDragging,
  onClickCapture,
  onPointerCancel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
} = useSwipe({
  disabled: isSwipeDisabled,
  onSwipe: (direction) => {
    const voteValue: VoteValue = direction === 'left' ? -1 : direction === 'right' ? 1 : 2
    emit('vote', voteValue)
  },
})
</script>

<template>
  <p-card
    class="breed-card mb-7 h-full max-h-full w-full select-none overflow-hidden shadow-xl will-change-transform cursor-pointer"
    :class="{
      'cursor-grabbing': isDragging,
      'breed-card--swipe-left': feedback === 'left',
      'breed-card--swipe-right': feedback === 'right',
      'breed-card--swipe-up': feedback === 'up',
    }"
    :style="cardStyle"
    :aria-labelledby="`image-${image.id}-name`"
    :pt="{
      body: { class: '!p-0 flex h-full min-h-0 flex-col' },
      content: { class: '!p-0 flex min-h-0 flex-1 flex-col' },
    }"
    @click.capture="onClickCapture"
    @click="onCardClick"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerCancel"
  >
    <template #content>
      <div
        class="breed-card__image-wrapper group relative min-h-0 w-full flex-1 cursor-pointer overflow-hidden"
        role="button"
        tabindex="0"
        :aria-expanded="showDetails"
        :aria-label="`View details for ${breedName}`"
        @keydown.enter.prevent="toggleDetails"
        @keydown.space.prevent="toggleDetails"
      >
        <div
          v-if="image.url"
          class="h-full w-full bg-contain bg-center bg-no-repeat transition-transform duration-200 group-hover:scale-[1.015]"
          :style="{ backgroundImage: `url('${image.url}')` }"
          role="img"
          :aria-label="breedName"
          :aria-hidden="showDetails"
        />
        <span
          v-else
          class="flex h-full min-h-48 flex-col items-center justify-center gap-3 bg-[#e9e2d9] font-bold text-[var(--color-text-muted)]"
          role="img"
          aria-label="No image available"
          :aria-hidden="showDetails"
        >
          <span class="text-5xl" aria-hidden="true">🐕</span>
          <span>No image available</span>
        </span>
        <span
          v-if="!showDetails"
          class="breed-card__hint pointer-events-none absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-xs font-semibold text-white opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100"
        >
          <IconInfo class="h-3.5 w-3.5" />
          Click to view breed info
        </span>

        <Transition name="fade">
          <div
            v-if="showDetails"
            class="breed-card__overlay absolute inset-0 flex flex-col bg-black/70 p-5 text-white"
            role="region"
            :aria-label="`${breedName} breed information`"
          >
            <button
              type="button"
              class="breed-card__overlay-close absolute top-3 right-3 inline-flex h-9 w-9 border-0 transition-colors duration-300 items-center justify-center rounded-full cursor-pointer bg-white/15 text-white transition-colors hover:bg-white/25"
              aria-label="Close breed details"
              data-card-action
              @click.stop="closeDetails"
            >
              <IconClose class="h-4 w-4" />
            </button>

            <dl
              class="breed-card__details-list m-0 flex flex-1 flex-col justify-center gap-4 overflow-y-auto py-8"
            >
              <div v-for="field in detailFields" :key="field.label" class="breed-card__details-row">
                <dt class="m-0 text-sm font-bold tracking-[0.08em] text-white/65 uppercase">
                  {{ field.label }}
                </dt>
                <dd class="mt-1 mb-0 leading-6 font-medium text-white">
                  {{ field.value || 'Not available' }}
                </dd>
              </div>
            </dl>
          </div>
        </Transition>
      </div>

      <div class="shrink-0 p-5">
        <div class="group block w-full border-0 bg-transparent p-0 text-left text-inherit">
          <span
            :id="`image-${image.id}-name`"
            class="block text-[clamp(1.75rem,7vw,2.25rem)] leading-none font-extrabold tracking-[-0.045em] transition-colors group-hover:text-[var(--color-primary-dark)]"
          >
            {{ breedName }}
          </span>
          <span class="mt-3 block min-h-12 leading-6 text-gray-500">
            {{ breed?.breed_group || 'Breed group unavailable' }}
          </span>
        </div>

        <div class="mt-5 flex justify-center gap-8" aria-label="Choose this breed">
          <p-button
            class="!h-[3.75rem] !w-[3.75rem] !text-3xl !shadow-lg"
            severity="danger"
            rounded
            outlined
            :disabled="isVoting"
            :aria-label="`Dislike ${breedName}`"
            data-vote-action
            v-tooltip.top="`Dislike`"
            @click.prevent="emit('vote', VoteValueEnum.Dislike)"
          >
            <IconClose class="text-red-500" />
          </p-button>
          <p-button
            class="!h-[3.75rem] !w-[3.75rem] !text-2xl !text-white !shadow-lg"
            severity="info"
            rounded
            :disabled="isVoting"
            :aria-label="`Super like ${breedName}`"
            data-vote-action
            v-tooltip.top="`Super like`"
            @click.prevent="emit('vote', VoteValueEnum.SuperLike)"
          >
            <IconStar class="fill-current" />
          </p-button>
          <p-button
            class="!h-[3.75rem] !w-[3.75rem] !text-2xl !shadow-lg"
            severity="success"
            rounded
            :disabled="isVoting"
            :aria-label="`Like ${breedName}`"
            data-vote-action
            v-tooltip.top="`Like`"
            @click.prevent="emit('vote', VoteValueEnum.Like)"
          >
            <IconCheck class="text-white" />
          </p-button>
        </div>
      </div>
    </template>
  </p-card>
</template>

<style scoped>
.breed-card {
  touch-action: pan-down pinch-zoom;
  transform-origin: center center;
}

@media (prefers-reduced-motion: no-preference) {
  .breed-card--swipe-left {
    animation: swipe-left 320ms ease-in forwards;
  }

  .breed-card--swipe-right {
    animation: swipe-right 320ms ease-in forwards;
  }

  .breed-card--swipe-up {
    animation: swipe-up 320ms ease-in forwards;
  }
}

@keyframes swipe-left {
  to {
    opacity: 0;
    transform: translate3d(-130%, 12%, 0) rotate(-28deg);
  }
}

@keyframes swipe-right {
  to {
    opacity: 0;
    transform: translate3d(130%, 12%, 0) rotate(28deg);
  }
}

@keyframes swipe-up {
  to {
    opacity: 0;
    transform: translate3d(0, -140%, 0) scale(1.06) rotate(10deg);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 220ms ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .fade-enter-active,
  .fade-leave-active {
    transition: none;
  }
}
</style>
