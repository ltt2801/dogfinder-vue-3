import { StorageSerializers, useLocalStorage } from '@vueuse/core'
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import type { VoteValue } from '@/config/common'
import type { DogBreed } from '@/models/dog'
import { dogApi } from '@/services/dogApi'
import { useUserStore } from '@/stores/user'

export const BREED_PROGRESS_STORAGE_KEY = 'dogfinder:breed-progress:v1'

interface BreedProgress {
  version: 1
  currentBreedId: number | null
  currentIndex: number
}

const INITIAL_PROGRESS: BreedProgress = {
  version: 1,
  currentBreedId: null,
  currentIndex: 0,
}

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'An unexpected error occurred.'

const normalizeProgress = (value: BreedProgress): BreedProgress => {
  if (
    value?.version !== 1 ||
    !Number.isInteger(value.currentIndex) ||
    value.currentIndex < 0 ||
    (value.currentBreedId !== null && !Number.isInteger(value.currentBreedId))
  ) {
    return { ...INITIAL_PROGRESS }
  }

  return value
}

export const useBreedsStore = defineStore('breeds', () => {
  const breeds = ref<DogBreed[]>([])
  const currentIndex = ref(0)
  const isLoading = ref(false)
  const hasLoaded = ref(false)
  const loadError = ref<string | null>(null)
  const isVoting = ref(false)
  const voteError = ref<string | null>(null)
  const progress = useLocalStorage<BreedProgress>(
    BREED_PROGRESS_STORAGE_KEY,
    { ...INITIAL_PROGRESS },
    {
      flush: 'sync',
      serializer: StorageSerializers.object,
    },
  )

  const currentBreed = computed(() => breeds.value[currentIndex.value] ?? null)
  const isComplete = computed(() => hasLoaded.value && currentIndex.value >= breeds.value.length)
  const error = computed(() => voteError.value ?? loadError.value)

  const persistCurrentPosition = () => {
    progress.value = {
      version: 1,
      currentIndex: currentIndex.value,
      currentBreedId: currentBreed.value?.id ?? null,
    }
  }

  const restoreCurrentPosition = () => {
    const savedProgress = normalizeProgress(progress.value)
    const savedBreedIndex =
      savedProgress.currentBreedId === null
        ? -1
        : breeds.value.findIndex((breed) => breed.id === savedProgress.currentBreedId)

    currentIndex.value =
      savedBreedIndex >= 0
        ? savedBreedIndex
        : Math.min(savedProgress.currentIndex, breeds.value.length)
    persistCurrentPosition()
  }

  const loadBreeds = async () => {
    if (isLoading.value) {
      return false
    }

    isLoading.value = true
    loadError.value = null

    try {
      breeds.value = await dogApi.getBreeds()
      restoreCurrentPosition()
      hasLoaded.value = true
      return true
    } catch (caughtError) {
      loadError.value = getErrorMessage(caughtError)
      return false
    } finally {
      isLoading.value = false
    }
  }

  const voteForCurrentBreed = async (value: VoteValue) => {
    if (isVoting.value) {
      return false
    }

    const breed = currentBreed.value
    if (!breed) {
      voteError.value = 'There is no breed available to vote for.'
      return false
    }

    if (!breed.image?.id) {
      voteError.value = 'This breed does not have an image available for voting.'
      return false
    }

    isVoting.value = true
    voteError.value = null

    try {
      // initialize user if not already initialized
      const user = useUserStore().initializeUser()
      await dogApi.createVote({
        image_id: breed.image.id,
        sub_id: user.subId,
        value,
      })
      currentIndex.value += 1
      persistCurrentPosition()
      return true
    } catch (caughtError) {
      voteError.value = getErrorMessage(caughtError)
      return false
    } finally {
      isVoting.value = false
    }
  }

  const getBreedById = (id: number) => breeds.value.find((breed) => breed.id === id)

  const resetProgress = () => {
    currentIndex.value = 0
    voteError.value = null
    progress.value = { ...INITIAL_PROGRESS }

    if (breeds.value.length > 0) {
      persistCurrentPosition()
    }
  }

  return {
    breeds,
    currentIndex,
    currentBreed,
    isLoading,
    hasLoaded,
    isComplete,
    loadError,
    isVoting,
    voteError,
    error,
    loadBreeds,
    voteForCurrentBreed,
    getBreedById,
    resetProgress,
  }
})
