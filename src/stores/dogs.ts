import { StorageSerializers, useLocalStorage } from '@vueuse/core'
import { computed, onScopeDispose, ref, watch } from 'vue'
import { defineStore } from 'pinia'

import type { VoteValue } from '@/config/common'
import type { DogBreed, DogImage } from '@/models/dog'
import { dogApi } from '@/services/dogApi'
import { useUserStore } from '@/stores/user'

export const IMAGE_PROGRESS_STORAGE_KEY = 'dogfinder:dog-progress:v1'
const BREED_INFO_PREFETCH_DELAY_MS = 200
const VISIBLE_CARD_LIMIT = 5

interface BreedProgress {
  version: 1
  currentBreedId: number | null
}

const INITIAL_PROGRESS: BreedProgress = {
  version: 1,
  currentBreedId: null,
}

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'An unexpected error occurred.'

const normalizeProgress = (value: BreedProgress): BreedProgress => {
  if (value?.version !== 1 || !Number.isSafeInteger(value.currentBreedId)) {
    return { ...INITIAL_PROGRESS }
  }

  return value
}

const normalizeBreedInfo = (breedInfo: DogBreed) => {
  const breedId = Number(breedInfo?.id)

  if (!Number.isSafeInteger(breedId) || breedId <= 0 || typeof breedInfo?.name !== 'string') {
    return null
  }

  return { ...breedInfo, id: breedId }
}

const createImageFromBreedInfo = (breedInfo: DogBreed) => {
  const normalizedBreedInfo = normalizeBreedInfo(breedInfo)
  const image = normalizedBreedInfo?.image

  if (!normalizedBreedInfo || !image?.id || !image.url) {
    return null
  }

  return {
    ...image,
    breeds: [normalizedBreedInfo],
  } satisfies DogImage
}

export const useDogsStore = defineStore('dogs', () => {
  const images = ref<DogImage[]>([])
  const currentIndex = ref(0)
  const isLoading = ref(false)
  const hasLoaded = ref(false)
  const hasLoadedBreedInfo = ref(true)
  const loadError = ref<string | null>(null)
  const isVoting = ref(false)
  const voteError = ref<string | null>(null)
  const breedInfoById = ref<Record<number, DogBreed>>({})
  const pendingBreedInfoIds = new Set<number>()
  let breedInfoPrefetchTimer: ReturnType<typeof setTimeout> | undefined
  let imagePrefetchPromise: Promise<boolean> | null = null
  const progress = useLocalStorage<BreedProgress>(
    IMAGE_PROGRESS_STORAGE_KEY,
    { ...INITIAL_PROGRESS },
    {
      flush: 'sync',
      serializer: StorageSerializers.object,
    },
  )

  const currentImage = computed(() => images.value[currentIndex.value] ?? null)
  const visibleImages = computed(() =>
    images.value.slice(currentIndex.value, currentIndex.value + VISIBLE_CARD_LIMIT),
  )
  const currentBreedInfo = computed(() => {
    const imageBreed = currentImage.value?.breeds?.[0]

    if (!imageBreed) {
      return null
    }

    return breedInfoById.value[Number(imageBreed.id)] ?? imageBreed
  })
  const isComplete = computed(() => hasLoaded.value && currentIndex.value >= images.value.length)
  const error = computed(() => voteError.value ?? loadError.value)

  const persistCurrentPosition = () => {
    progress.value = {
      version: 1,
      currentBreedId: Number(currentImage.value?.breeds?.[0]?.id ?? 0),
    }
  }

  const loadImages = async () => {
    if (isLoading.value) {
      return false
    }

    isLoading.value = true
    loadError.value = null

    try {
      const savedProgress = normalizeProgress(progress.value)
      const savedBreedId = Number(savedProgress.currentBreedId)

      if (Number.isSafeInteger(savedBreedId) && savedBreedId > 0) {
        try {
          const breedInfo = await dogApi.getInfoByBreedId(savedBreedId)
          const restoredImage = createImageFromBreedInfo(breedInfo)

          if (restoredImage) {
            const restoredBreed = restoredImage.breeds?.[0]
            images.value = [restoredImage]
            currentIndex.value = 0

            if (restoredBreed) {
              breedInfoById.value[savedBreedId] = restoredBreed
            }

            hasLoaded.value = true
            persistCurrentPosition()
            void prefetchMoreImages()
            return true
          }
        } catch {
          // A missing or unavailable saved breed falls back to a fresh discovery batch.
        }
      }

      images.value = await dogApi.getBreedImages()
      currentIndex.value = 0
      hasLoaded.value = true
      persistCurrentPosition()
      return true
    } catch (caughtError) {
      loadError.value = getErrorMessage(caughtError)
      return false
    } finally {
      isLoading.value = false
    }
  }

  const loadImageByBreedId = async (breedId: number) => {
    if (isLoading.value) {
      return false
    }

    isLoading.value = true
    loadError.value = null

    try {
      const [image] = await dogApi.getBreedImages(1, 0, 'RAND', breedId)

      if (image) {
        const storedImageIndex = images.value.findIndex(
          (storedImage) => storedImage.id === image.id,
        )

        if (storedImageIndex >= 0) {
          images.value[storedImageIndex] = image
        } else {
          images.value.push(image)
        }
      }

      hasLoaded.value = true
      return image ?? null
    } catch (caughtError) {
      loadError.value = getErrorMessage(caughtError)
      return null
    } finally {
      isLoading.value = false
    }
  }

  const voteForCurrentImage = async (value: VoteValue) => {
    if (isVoting.value) {
      return false
    }

    const image = currentImage.value
    if (!image) {
      voteError.value = 'There is no dog image available to vote for.'
      return false
    }

    isVoting.value = true
    voteError.value = null

    try {
      // initialize user if not already initialized
      const user = useUserStore().initializeUser()
      await dogApi.createVote({
        image_id: image.id,
        sub_id: user.subId,
        value,
      })

      const nextIndex = currentIndex.value + 1
      const reachedQueueEnd = nextIndex >= images.value.length

      if (reachedQueueEnd) {
        await prefetchMoreImages()
      }

      currentIndex.value = nextIndex < images.value.length ? nextIndex : images.value.length
      persistCurrentPosition()

      if (!reachedQueueEnd) {
        void prefetchMoreImagesIfNeeded()
      }

      return true
    } catch (caughtError) {
      voteError.value = getErrorMessage(caughtError)
      return false
    } finally {
      isVoting.value = false
    }
  }

  const getImageByBreedId = (breedId: number) =>
    images.value.find((image) => image.breeds?.some((breed) => Number(breed.id) === breedId))

  const prefetchMoreImages = () => {
    if (imagePrefetchPromise) {
      return imagePrefetchPromise
    }

    imagePrefetchPromise = (async () => {
      try {
        const prefetchedImages = await dogApi.getBreedImages()
        const knownImageIds = new Set(images.value.map((image) => image.id))
        const uniqueImages = prefetchedImages.filter((image) => !knownImageIds.has(image.id))

        images.value.push(...uniqueImages)
        return uniqueImages.length > 0
      } catch {
        return false
      } finally {
        imagePrefetchPromise = null
      }
    })()

    return imagePrefetchPromise
  }

  const prefetchMoreImagesIfNeeded = () => {
    const remainingImages = images.value.length - currentIndex.value

    if (remainingImages <= VISIBLE_CARD_LIMIT) {
      return prefetchMoreImages()
    }

    return Promise.resolve(false)
  }

  const loadBreedInfo = async (breedId: number) => {
    if (breedInfoById.value[breedId] || pendingBreedInfoIds.has(breedId)) {
      return breedInfoById.value[breedId] ?? null
    }

    pendingBreedInfoIds.add(breedId)

    try {
      const breedInfo = await dogApi.getInfoByBreedId(breedId)
      const normalizedBreedInfo = normalizeBreedInfo(breedInfo)

      if (!normalizedBreedInfo) {
        return null
      }

      breedInfoById.value[breedId] = normalizedBreedInfo
      return normalizedBreedInfo
    } catch {
      return null
    } finally {
      pendingBreedInfoIds.delete(breedId)
    }
  }

  watch(
    currentImage,
    (image) => {
      clearTimeout(breedInfoPrefetchTimer)

      const breedId = Number(image?.breeds?.[0]?.id)
      if (!Number.isSafeInteger(breedId) || breedId <= 0 || breedInfoById.value[breedId]) {
        return
      }

      hasLoadedBreedInfo.value = false

      breedInfoPrefetchTimer = setTimeout(async () => {
        // waiting for the breed info to load
        await loadBreedInfo(breedId)
        hasLoadedBreedInfo.value = true
      }, BREED_INFO_PREFETCH_DELAY_MS)
    },
    { immediate: true },
  )

  onScopeDispose(() => {
    clearTimeout(breedInfoPrefetchTimer)
  })

  const resetProgress = () => {
    currentIndex.value = 0
    voteError.value = null
    progress.value = { ...INITIAL_PROGRESS }

    if (images.value.length > 0) {
      persistCurrentPosition()
    }
  }

  return {
    images,
    currentIndex,
    currentImage,
    visibleImages,
    currentBreedInfo,
    isLoading,
    hasLoaded,
    hasLoadedBreedInfo,
    isComplete,
    loadError,
    isVoting,
    voteError,
    error,
    loadImages,
    loadImageByBreedId,
    voteForCurrentImage,
    getImageByBreedId,
    prefetchMoreImagesIfNeeded,
    loadBreedInfo,
    resetProgress,
  }
})
