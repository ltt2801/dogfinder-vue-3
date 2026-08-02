<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import IconCheck from '~icons/lucide/check'
import IconClose from '~icons/lucide/x'
import IconLoaderCircle from '~icons/lucide/loader-circle'
import IconInfo from '~icons/lucide/info'
import IconStar from '~icons/lucide/star'
import IconTrash from '~icons/lucide/trash-2'

import { useSwipe } from '@/composables/useSwipe'
import type { DogBreed, DogImage } from '@/models/dog'
import { VoteValueEnum } from '@/config/enum'
import type { VoteValue } from '@/config/common'
import { useDogsStore } from '@/stores/dogs'

const props = withDefaults(
  defineProps<{
    image: DogImage
    breedInfo?: DogBreed | null
    isVoting: boolean
    interactive?: boolean
    allowDetails?: boolean
    showVoteActions?: boolean
    showDeleteAction?: boolean
    isDeleting?: boolean
    voteValue?: VoteValue
  }>(),
  {
    breedInfo: null,
    interactive: true,
    allowDetails: true,
    showVoteActions: true,
    showDeleteAction: false,
    isDeleting: false,
    voteValue: undefined,
  },
)

const emit = defineEmits<{
  vote: [value: VoteValue]
  delete: [event: MouseEvent]
}>()

const dogsStore = useDogsStore()
const { hasLoadedBreedInfo } = storeToRefs(dogsStore)

const showDetails = ref(false)
const fetchedBreedInfo = ref<DogBreed | null>(null)
const isFetchingBreedInfo = ref(false)
let fetchedForBreedId: number | null = null

const breed = computed(() => props.breedInfo ?? fetchedBreedInfo.value ?? props.image.breeds?.[0])
const breedName = computed(() => breed.value?.name ?? 'Unknown breed')
const voteBadge = computed(() => {
  switch (props.voteValue) {
    case VoteValueEnum.Dislike:
      return { label: 'Dislike', severity: 'danger' as const }
    case VoteValueEnum.Like:
      return { label: 'Like', severity: 'success' as const }
    case VoteValueEnum.SuperLike:
      return { label: 'Super Like', severity: 'info' as const }
    default:
      return null
  }
})

watch(
  () => props.image.id,
  () => {
    showDetails.value = false
    fetchedBreedInfo.value = null
    fetchedForBreedId = null
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

const ensureFullBreedInfoLoaded = async () => {
  if (props.breedInfo) {
    return
  }

  const breedId = Number(props.image.breeds?.[0]?.id)
  if (!Number.isSafeInteger(breedId) || breedId <= 0 || fetchedForBreedId === breedId) {
    return
  }

  fetchedForBreedId = breedId
  isFetchingBreedInfo.value = true

  try {
    fetchedBreedInfo.value = await dogsStore.loadBreedInfo(breedId)
  } finally {
    isFetchingBreedInfo.value = false
  }
}

const toggleDetails = () => {
  if (!props.allowDetails) {
    return
  }

  showDetails.value = !showDetails.value

  if (showDetails.value) {
    void ensureFullBreedInfoLoaded()
  }
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

const isSwipeDisabled = computed(() => props.isVoting || !props.interactive)
const {
  cardStyle,
  feedback,
  isDragging,
  onClickCapture,
  onPointerCancel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  resetFeedback,
} = useSwipe({
  disabled: isSwipeDisabled,
  autoResetFeedback: false,
  onSwipe: (direction) => {
    const voteValue: VoteValue = direction === 'left' ? -1 : direction === 'right' ? 1 : 2
    emit('vote', voteValue)
  },
})

watch(
  () => props.isVoting,
  (isVoting, wasVoting) => {
    if (wasVoting && !isVoting) {
      resetFeedback()
    }
  },
)

const onVoteClick = (value: VoteValue) => {
  if (props.isVoting || !props.interactive) {
    return
  }

  emit('vote', value)
}

const onDeleteClick = (event: MouseEvent) => {
  if (props.isDeleting) {
    return
  }

  emit('delete', event)
}
</script>

<template>
  <p-card
    class="breed-card mb-7 w-full select-none overflow-hidden shadow-xl will-change-transform cursor-pointer"
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
        class="breed-card__image-wrapper group relative min-h-0 w-full flex-1 overflow-hidden"
        :class="allowDetails ? 'cursor-pointer' : 'cursor-default'"
        :role="allowDetails ? 'button' : undefined"
        :tabindex="allowDetails ? 0 : -1"
        :aria-expanded="showDetails"
        :aria-label="`View details for ${breedName}`"
        @keydown.enter.prevent="toggleDetails"
        @keydown.space.prevent="toggleDetails"
      >
        <div v-if="voteBadge" class="absolute top-3 left-3 z-10">
          <p-badge :value="voteBadge.label" :severity="voteBadge.severity" size="xlarge" />
        </div>
        <button
          v-if="showDeleteAction && !showDetails"
          type="button"
          class="breed-card__delete-button absolute top-3 right-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full cursor-pointer border-0 bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="isDeleting"
          :aria-label="`Delete vote for ${breedName}`"
          data-card-action
          v-tooltip.top="'Delete vote'"
          @pointerdown.stop
          @click.stop="onDeleteClick"
        >
          <IconLoaderCircle v-if="isDeleting" class="h-4 w-4 animate-spin" />
          <IconTrash v-else class="h-4 w-4" />
        </button>
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
          v-if="!showDetails && allowDetails"
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

            <div
              v-if="(interactive && !hasLoadedBreedInfo) || isFetchingBreedInfo"
              class="flex justify-center items-center h-full"
            >
              <IconLoaderCircle class="h-20 w-20 animate-spin opacity-50" />
            </div>
            <div v-else class="mt-9 flex flex-1 flex-col justify-center overflow-y-auto">
              <div
                class="breed-card__details-list flex flex-1 flex-col justify-center gap-4 py-8 mt-9"
              >
                <div
                  v-for="field in detailFields"
                  :key="field.label"
                  class="breed-card__details-row"
                >
                  <dt class="m-0 text-sm font-bold tracking-[0.08em] text-white/65 uppercase">
                    {{ field.label }}
                  </dt>
                  <dd class="mt-1 mb-0 leading-6 font-medium text-white">
                    {{ field.value || 'Not available' }}
                  </dd>
                </div>
              </div>
            </div>
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

        <div
          v-if="showVoteActions"
          class="mt-5 flex justify-center gap-8"
          aria-label="Choose this breed"
        >
          <p-button
            class="!h-[3.75rem] !w-[3.75rem] !text-3xl !shadow-lg"
            severity="danger"
            rounded
            outlined
            :disabled="isVoting || !interactive"
            :aria-label="`Dislike ${breedName}`"
            data-vote-action
            v-tooltip.top="`Dislike`"
            @pointerdown.stop
            @click.stop="onVoteClick(VoteValueEnum.Dislike)"
          >
            <IconClose class="text-red-500" />
          </p-button>
          <p-button
            class="!h-[3.75rem] !w-[3.75rem] !text-2xl !text-white !shadow-lg"
            severity="info"
            rounded
            :disabled="isVoting || !interactive"
            :aria-label="`Super like ${breedName}`"
            data-vote-action
            v-tooltip.top="`Super like`"
            @pointerdown.stop
            @click.stop="onVoteClick(VoteValueEnum.SuperLike)"
          >
            <IconStar class="fill-current" />
          </p-button>
          <p-button
            class="!h-[3.75rem] !w-[3.75rem] !text-2xl !shadow-lg"
            severity="success"
            rounded
            :disabled="isVoting || !interactive"
            :aria-label="`Like ${breedName}`"
            data-vote-action
            v-tooltip.top="`Like`"
            @pointerdown.stop
            @click.stop="onVoteClick(VoteValueEnum.Like)"
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
