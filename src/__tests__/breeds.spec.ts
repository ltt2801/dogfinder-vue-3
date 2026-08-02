import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { DogBreed, DogImage } from '@/models/dog'
import type { CreateVoteRequest } from '@/models/vote'
import { IMAGE_PROGRESS_STORAGE_KEY, useDogsStore } from '@/stores/dogs'

const apiMocks = vi.hoisted(() => ({
  getBreedImages: vi.fn<() => Promise<DogImage[]>>(),
  getInfoByBreedId: vi.fn<(breedId: number) => Promise<DogBreed>>(),
  createVote: vi.fn<(payload: CreateVoteRequest) => Promise<unknown>>(),
}))

vi.mock('@/services/dogApi', () => ({
  dogApi: apiMocks,
}))

vi.mock('@faker-js/faker', () => ({
  faker: {
    person: { fullName: () => 'Store User' },
    string: { uuid: () => 'store-user-id' },
  },
}))

const images: DogImage[] = [
  {
    id: 'image-1',
    url: 'https://cdn.example/image-1.jpg',
    breeds: [
      {
        id: 1,
        name: 'Affenpinscher',
        weight: { imperial: '6 - 13', metric: '3 - 6' },
        height: { imperial: '9 - 11.5', metric: '23 - 29' },
      },
    ],
  },
  {
    id: 'image-2',
    url: 'https://cdn.example/image-2.jpg',
    breeds: [
      {
        id: 2,
        name: 'Akita',
        weight: { imperial: '65 - 115', metric: '29 - 52' },
        height: { imperial: '24 - 28', metric: '61 - 71' },
      },
    ],
  },
]

describe('images store', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    apiMocks.getBreedImages.mockReset().mockResolvedValue(images)
    apiMocks.getInfoByBreedId.mockReset().mockResolvedValue({
      id: 1,
      name: 'Affenpinscher',
      temperament: 'Curious, confident',
    })
    apiMocks.createVote.mockReset().mockResolvedValue({ id: 1 })
  })

  it('prefetches full breed information after the configured delay', async () => {
    vi.useFakeTimers()

    try {
      const store = useDogsStore()
      await store.loadImages()

      await vi.advanceTimersByTimeAsync(99)
      expect(apiMocks.getInfoByBreedId).not.toHaveBeenCalled()

      await vi.advanceTimersByTimeAsync(1)
      expect(apiMocks.getInfoByBreedId).toHaveBeenCalledExactlyOnceWith(1)
      expect(apiMocks.getInfoByBreedId).toHaveBeenCalledWith(1)
      expect(store.currentBreedInfo?.temperament).toBe('Curious, confident')
    } finally {
      vi.useRealTimers()
    }
  })

  it('restores a valid saved breed with its full information and image', async () => {
    localStorage.setItem(
      IMAGE_PROGRESS_STORAGE_KEY,
      JSON.stringify({ version: 1, currentBreedId: 2, currentIndex: 3 }),
    )
    apiMocks.getInfoByBreedId.mockResolvedValueOnce({
      id: 2,
      name: 'Akita',
      temperament: 'Loyal',
      image: {
        id: 'restored-image',
        url: 'https://cdn.example/restored-image.jpg',
      },
    })
    const store = useDogsStore()

    await expect(store.loadImages()).resolves.toBe(true)

    expect(apiMocks.getInfoByBreedId).toHaveBeenCalledWith(2)
    expect(apiMocks.getBreedImages).toHaveBeenCalledOnce()
    expect(store.currentIndex).toBe(0)
    expect(store.currentImage?.id).toBe('restored-image')
    expect(store.currentImage?.breeds?.[0]?.id).toBe(2)
    expect(store.currentBreedInfo?.temperament).toBe('Loyal')
  })

  it('loads a fresh image batch when the saved breed id has the wrong type', async () => {
    localStorage.setItem(
      IMAGE_PROGRESS_STORAGE_KEY,
      JSON.stringify({ version: 1, currentBreedId: '348', currentIndex: 3 }),
    )
    const store = useDogsStore()

    await expect(store.loadImages()).resolves.toBe(true)

    expect(apiMocks.getInfoByBreedId).not.toHaveBeenCalled()
    expect(apiMocks.getBreedImages).toHaveBeenCalledOnce()
    expect(store.currentImage?.id).toBe('image-1')
  })

  it('loads a fresh image batch when the saved breed API returns 404', async () => {
    localStorage.setItem(
      IMAGE_PROGRESS_STORAGE_KEY,
      JSON.stringify({ version: 1, currentBreedId: 348, currentIndex: 3 }),
    )
    apiMocks.getInfoByBreedId.mockRejectedValueOnce(new Error('Breed not found'))
    const store = useDogsStore()

    await expect(store.loadImages()).resolves.toBe(true)

    expect(apiMocks.getInfoByBreedId).toHaveBeenCalledWith(348)
    expect(apiMocks.getBreedImages).toHaveBeenCalledOnce()
    expect(store.currentImage?.id).toBe('image-1')
  })

  it('loads a fresh image batch when the saved breed response is an error body', async () => {
    localStorage.setItem(
      IMAGE_PROGRESS_STORAGE_KEY,
      JSON.stringify({ version: 1, currentBreedId: 348, currentIndex: 3 }),
    )
    apiMocks.getInfoByBreedId.mockResolvedValueOnce({
      statusCode: 404,
      message: 'Breed not found',
      error: 'Not Found',
    } as unknown as DogBreed)
    const store = useDogsStore()

    await expect(store.loadImages()).resolves.toBe(true)

    expect(apiMocks.getBreedImages).toHaveBeenCalledOnce()
    expect(store.currentImage?.id).toBe('image-1')
  })

  it('uses a stable user sub_id and advances only after a successful vote', async () => {
    const store = useDogsStore()
    await store.loadImages()

    await expect(store.voteForCurrentImage(1)).resolves.toBe(true)

    expect(apiMocks.createVote).toHaveBeenCalledWith({
      image_id: 'image-1',
      sub_id: 'store-user-id',
      value: 1,
    })
    expect(store.currentImage?.id).toBe('image-2')
    expect(JSON.parse(localStorage.getItem(IMAGE_PROGRESS_STORAGE_KEY) ?? 'null')).toEqual({
      version: 1,
      currentBreedId: 2,
    })
  })

  it('keeps five cards ready and prefetches another batch after five votes', async () => {
    const firstBatch = Array.from({ length: 10 }, (_, index) => ({
      id: `batch-1-image-${index + 1}`,
      url: `https://cdn.example/batch-1-image-${index + 1}.jpg`,
      breeds: [{ id: index + 1, name: `Breed ${index + 1}` }],
    }))
    const secondBatch = Array.from({ length: 10 }, (_, index) => ({
      id: `batch-2-image-${index + 1}`,
      url: `https://cdn.example/batch-2-image-${index + 1}.jpg`,
      breeds: [{ id: index + 11, name: `Breed ${index + 11}` }],
    }))
    apiMocks.getBreedImages.mockResolvedValueOnce(firstBatch).mockResolvedValueOnce(secondBatch)
    const store = useDogsStore()

    await store.loadImages()
    expect(store.visibleImages).toHaveLength(5)

    for (let voteIndex = 0; voteIndex < 4; voteIndex += 1) {
      await store.voteForCurrentImage(1)
    }
    expect(apiMocks.getBreedImages).toHaveBeenCalledOnce()

    await store.voteForCurrentImage(1)
    await vi.waitFor(() => {
      expect(apiMocks.getBreedImages).toHaveBeenCalledTimes(2)
      expect(store.images).toHaveLength(20)
    })

    expect(store.currentIndex).toBe(5)
    expect(store.visibleImages).toHaveLength(5)
    expect(store.visibleImages[0]?.id).toBe('batch-1-image-6')
  })

  it('keeps the current breed available when voting fails', async () => {
    apiMocks.createVote.mockRejectedValueOnce(new Error('Vote rejected'))
    const store = useDogsStore()
    await store.loadImages()

    await expect(store.voteForCurrentImage(-1)).resolves.toBe(false)

    expect(store.currentImage?.id).toBe('image-1')
    expect(store.voteError).toBe('Vote rejected')
  })

  it('prevents duplicate vote requests while one is in progress', async () => {
    let finishRequest: (() => void) | undefined
    apiMocks.createVote.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishRequest = () => resolve({ id: 1 })
        }),
    )
    const store = useDogsStore()
    await store.loadImages()

    const firstVote = store.voteForCurrentImage(1)
    await expect(store.voteForCurrentImage(1)).resolves.toBe(false)
    expect(apiMocks.createVote).toHaveBeenCalledOnce()

    finishRequest?.()
    await expect(firstVote).resolves.toBe(true)
    expect(store.currentIndex).toBe(1)
  })

  it('resets corrupt progress to the first breed', async () => {
    localStorage.setItem(
      IMAGE_PROGRESS_STORAGE_KEY,
      JSON.stringify({ version: 99, currentBreedId: 42, currentIndex: -4 }),
    )
    const store = useDogsStore()

    await store.loadImages()

    expect(store.currentIndex).toBe(0)
    expect(store.currentImage?.id).toBe('image-1')
  })
})
