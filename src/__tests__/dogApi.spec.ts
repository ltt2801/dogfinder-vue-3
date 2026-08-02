import { describe, expect, it, vi } from 'vitest'

import { createDogApiClient, DogApiConfigurationError } from '@/services/dogApi'
import type { DogBreed } from '@/models/dog'
import type { Vote } from '@/models/vote'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('dogApi', () => {
  it('loads breeds with deterministic pagination and the API key', async () => {
    const breeds: DogBreed[] = [
      {
        id: 1,
        name: 'Affenpinscher',
        weight: { imperial: '6 - 13', metric: '3 - 6' },
        height: { imperial: '9 - 11.5', metric: '23 - 29' },
        image: { id: 'BJa4kxc4X', url: 'https://cdn.example/dog.jpg' },
      },
    ]
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(breeds))
    const client = createDogApiClient({
      baseUrl: 'https://api.thedogapi.com/v1/',
      apiKey: 'test-key',
      fetchFn,
    })

    await expect(client.getBreeds()).resolves.toEqual(breeds)
    expect(fetchFn).toHaveBeenCalledWith(
      'https://api.thedogapi.com/v1/breeds?limit=1&page=0&order=ASC&has_breeds=1',
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: 'application/json',
          'x-api-key': 'test-key',
        }),
      }),
    )
  })

  it('loads breed images and can filter them by breed id', async () => {
    const images = [
      {
        id: 'akita-image',
        url: 'https://cdn.example/akita.jpg',
        breeds: [{ id: 6, name: 'Akita' }],
      },
    ]
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(images))
    const client = createDogApiClient({
      baseUrl: 'https://api.thedogapi.com/v1',
      apiKey: 'test-key',
      fetchFn,
    })

    await expect(client.getBreedImages(1, 0, 'RAND', 6)).resolves.toEqual(images)
    expect(fetchFn).toHaveBeenCalledWith(
      'https://api.thedogapi.com/v1/images/search?limit=1&page=0&size=small&order=RAND&has_breeds=true&breed_ids=6',
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('loads full breed information by breed id', async () => {
    const breed = { id: 6, name: 'Akita', temperament: 'Loyal' }
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(breed))
    const client = createDogApiClient({
      baseUrl: 'https://api.thedogapi.com/v1',
      apiKey: 'test-key',
      fetchFn,
    })

    await expect(client.getInfoByBreedId(6)).resolves.toEqual(breed)
    expect(fetchFn).toHaveBeenCalledWith(
      'https://api.thedogapi.com/v1/breeds/6',
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('creates a vote with the expected JSON payload', async () => {
    const vote: Vote = {
      id: 42,
      image_id: 'dog-image-id',
      sub_id: 'dogfinder-user',
      value: 1,
    }
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(vote))
    const client = createDogApiClient({
      baseUrl: 'https://api.thedogapi.com/v1',
      apiKey: 'test-key',
      fetchFn,
    })

    await expect(
      client.createVote({
        image_id: 'dog-image-id',
        sub_id: 'dogfinder-user',
        value: 1,
      }),
    ).resolves.toEqual(vote)
    expect(fetchFn).toHaveBeenCalledWith(
      'https://api.thedogapi.com/v1/votes',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'x-api-key': 'test-key',
        }),
        body: JSON.stringify({
          image_id: 'dog-image-id',
          sub_id: 'dogfinder-user',
          value: 1,
        }),
      }),
    )
  })

  it('loads vote history and resolves each image by id', async () => {
    const image = { id: 'dog-image-id', url: 'https://cdn.example/dog-image-id.jpg' }
    const votes: Vote[] = [{ id: 42, image_id: 'dog-image-id', sub_id: 'user id', value: 2 }]
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(votes))
      .mockResolvedValueOnce(jsonResponse(image))
    const client = createDogApiClient({
      baseUrl: 'https://api.thedogapi.com/v1',
      apiKey: 'test-key',
      fetchFn,
    })

    await expect(client.getVoteBySubId('user id')).resolves.toEqual(votes)
    await expect(client.getImageById('dog-image-id')).resolves.toEqual(image)

    expect(fetchFn).toHaveBeenNthCalledWith(
      1,
      'https://api.thedogapi.com/v1/votes?sub_id=user%20id',
      expect.objectContaining({ method: 'GET' }),
    )
    expect(fetchFn).toHaveBeenNthCalledWith(
      2,
      'https://api.thedogapi.com/v1/images/dog-image-id',
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('normalizes API error responses', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ message: 'Invalid API key' }, 401))
    const client = createDogApiClient({
      baseUrl: 'https://api.thedogapi.com/v1',
      apiKey: 'invalid-key',
      fetchFn,
    })

    await expect(client.getBreeds()).rejects.toMatchObject({
      name: 'DogApiError',
      message: 'Invalid API key',
      status: 401,
    })
  })

  it('normalizes network failures', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch'))
    const client = createDogApiClient({
      baseUrl: 'https://api.thedogapi.com/v1',
      apiKey: 'test-key',
      fetchFn,
    })

    await expect(client.getBreeds()).rejects.toMatchObject({
      name: 'DogApiError',
      message: 'Failed to fetch',
    })
  })

  it('rejects with a clear configuration error when the API key is missing', async () => {
    const fetchFn = vi.fn<typeof fetch>()
    const client = createDogApiClient({
      baseUrl: 'https://api.thedogapi.com/v1',
      apiKey: '',
      fetchFn,
    })

    await expect(client.getBreeds()).rejects.toEqual(
      new DogApiConfigurationError('Missing VITE_DOG_API_KEY environment variable.'),
    )
    expect(fetchFn).not.toHaveBeenCalled()
  })
})
