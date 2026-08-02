import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { DogBreed, DogImage } from '@/models/dog'
import type { CreateVoteRequest } from '@/models/vote'
import { useDogsStore } from '@/stores/dogs'
import HomeView from '@/views/HomeView.vue'

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
    person: { fullName: () => 'Discovery User' },
    string: { uuid: () => 'discovery-user-id' },
  },
}))

const akita: DogBreed = {
  id: 6,
  name: 'Akita',
  weight: { imperial: '65 - 115', metric: '29 - 52' },
  height: { imperial: '24 - 28', metric: '61 - 71' },
  breed_group: 'Working',
  life_span: '10 - 14 years',
  temperament: 'Docile, Alert, Responsive, Dignified',
}

const akitaImage: DogImage = {
  id: 'akita-image',
  url: 'https://cdn.example/akita.jpg',
  breeds: [akita],
}

const beagleImage: DogImage = {
  id: 'beagle-image',
  url: 'https://cdn.example/beagle.jpg',
  breeds: [{ ...akita, id: 7, name: 'Beagle' }],
}

const dispatchPointer = (element: Element, type: string, clientX: number, clientY: number) => {
  const event = new MouseEvent(type, {
    bubbles: true,
    button: 0,
    clientX,
    clientY,
  })
  Object.defineProperties(event, {
    isPrimary: { value: true },
    pointerId: { value: 1 },
    pointerType: { value: 'touch' },
  })
  element.dispatchEvent(event)
}

const mountHome = async () => {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'main', component: HomeView },
      {
        path: '/breeds/:id',
        name: 'breed-details',
        component: { template: '<p>Breed details</p>' },
      },
    ],
  })

  await router.push('/')
  await router.isReady()

  const wrapper = mount(HomeView, {
    global: {
      plugins: [pinia, router],
    },
  })

  return { wrapper, router, store: useDogsStore() }
}

describe('HomeView', () => {
  beforeEach(() => {
    localStorage.clear()
    apiMocks.getBreedImages.mockReset().mockResolvedValue([akitaImage])
    apiMocks.getInfoByBreedId.mockReset().mockResolvedValue(akita)
    apiMocks.createVote.mockReset().mockResolvedValue({ id: 1 })
  })

  it('shows a loading skeleton while breeds are being fetched', async () => {
    apiMocks.getBreedImages.mockReturnValueOnce(new Promise(() => undefined))

    const { wrapper } = await mountHome()

    expect(wrapper.get('[role="status"]').attributes('aria-label')).toBe('Loading dog breeds')
  })

  it('renders breed information and toggles the details overlay on click', async () => {
    const { wrapper, router, store } = await mountHome()
    await flushPromises()
    store.hasLoadedBreedInfo = true
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Akita')
    expect(wrapper.get('[role="img"]').attributes('style')).toContain(
      'https://cdn.example/akita.jpg',
    )

    await wrapper.get('.breed-card').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/')
    const details = wrapper.get('[role="region"]')
    expect(details.text()).toContain('Breed Name')
    expect(details.text()).toContain('Akita')
    expect(details.text()).toContain('Weight & Height')
    expect(details.text()).toContain('Docile, Alert, Responsive, Dignified')

    await wrapper.get('.breed-card').trigger('click')
    await flushPromises()

    expect(wrapper.find('[role="region"]').exists()).toBe(false)
  })

  it('renders five stacked cards and reveals the next card after voting', async () => {
    const stackedImages = [
      akitaImage,
      beagleImage,
      ...Array.from({ length: 4 }, (_, index) => ({
        id: `stack-image-${index + 3}`,
        url: `https://cdn.example/stack-image-${index + 3}.jpg`,
        breeds: [{ ...akita, id: index + 8, name: `Stack Breed ${index + 3}` }],
      })),
    ]
    apiMocks.getBreedImages.mockResolvedValueOnce(stackedImages)
    const { wrapper } = await mountHome()
    await flushPromises()

    const initialCards = wrapper.findAll('.breed-card')
    expect(initialCards).toHaveLength(5)
    expect(initialCards[0]?.attributes('aria-hidden')).toBe('false')
    expect(initialCards[1]?.attributes('aria-hidden')).toBe('true')
    expect(initialCards[1]?.attributes('style')).toContain('translateY')

    await wrapper.get('button[aria-label="Like Akita"]').trigger('click')
    await flushPromises()

    expect(wrapper.findAll('.breed-card')).toHaveLength(5)
    expect(wrapper.findAll('.breed-card')[0]?.text()).toContain('Beagle')
  })

  it('retries after a breed loading error', async () => {
    apiMocks.getBreedImages.mockRejectedValueOnce(new Error('Dog service is unavailable'))
    const { wrapper } = await mountHome()
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('Dog service is unavailable')

    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(apiMocks.getBreedImages).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('Akita')
  })

  it('sends the reject and like values and disables actions while voting', async () => {
    const { wrapper, router, store } = await mountHome()
    await flushPromises()
    const voteSpy = vi.spyOn(store, 'voteForCurrentImage').mockResolvedValue(true)

    await wrapper.get('button[aria-label="Dislike Akita"]').trigger('click')
    await wrapper.get('button[aria-label="Super like Akita"]').trigger('click')
    await wrapper.get('button[aria-label="Like Akita"]').trigger('click')

    expect(voteSpy).toHaveBeenNthCalledWith(1, -1)
    expect(voteSpy).toHaveBeenNthCalledWith(2, 2)
    expect(voteSpy).toHaveBeenNthCalledWith(3, 1)
    expect(router.currentRoute.value.fullPath).toBe('/')

    store.isVoting = true
    await wrapper.vm.$nextTick()

    expect(wrapper.get('button[aria-label="Dislike Akita"]').attributes()).toHaveProperty(
      'disabled',
    )
    expect(wrapper.get('button[aria-label="Super like Akita"]').attributes()).toHaveProperty(
      'disabled',
    )
    expect(wrapper.get('button[aria-label="Like Akita"]').attributes()).toHaveProperty('disabled')
  })

  it.each([
    ['left', { x: 140, y: 20 }, { x: 20, y: 25 }, -1],
    ['right', { x: 20, y: 20 }, { x: 140, y: 25 }, 1],
    ['up', { x: 20, y: 140 }, { x: 25, y: 20 }, 2],
  ] as const)(
    'sends a %s swipe as the expected API vote',
    async (_, startPosition, endPosition, value) => {
      const { wrapper } = await mountHome()
      await flushPromises()
      const card = wrapper.get('.breed-card')

      dispatchPointer(card.element, 'pointerdown', startPosition.x, startPosition.y)
      dispatchPointer(card.element, 'pointermove', endPosition.x, endPosition.y)
      dispatchPointer(card.element, 'pointerup', endPosition.x, endPosition.y)
      await flushPromises()

      expect(apiMocks.createVote).toHaveBeenCalledWith({
        image_id: 'akita-image',
        sub_id: 'discovery-user-id',
        value,
      })
    },
  )

  it('shows a fallback when breed metadata is missing', async () => {
    apiMocks.getBreedImages.mockResolvedValueOnce([{ ...akitaImage, breeds: [] }])
    const { wrapper } = await mountHome()
    await flushPromises()

    expect(wrapper.text()).toContain('Unknown breed')
    expect(wrapper.get('button[aria-label="Like Unknown breed"]').attributes()).not.toHaveProperty(
      'disabled',
    )
  })

  it('submits a Super Like with vote value 2', async () => {
    const { wrapper } = await mountHome()
    await flushPromises()

    await wrapper.get('button[aria-label="Super like Akita"]').trigger('click')
    await flushPromises()

    expect(apiMocks.createVote).toHaveBeenCalledWith({
      image_id: 'akita-image',
      sub_id: 'discovery-user-id',
      value: 2,
    })
  })

  it.each([
    ['Dislike', -1],
    ['Super like', 2],
    ['Like', 1],
  ] as const)('renders a different image after a successful %s vote', async (action, value) => {
    apiMocks.getBreedImages.mockResolvedValueOnce([akitaImage, beagleImage])
    const { wrapper } = await mountHome()
    await flushPromises()

    await wrapper.get(`button[aria-label="${action} Akita"]`).trigger('click')
    await flushPromises()

    expect(apiMocks.createVote).toHaveBeenCalledWith(
      expect.objectContaining({ image_id: 'akita-image', value }),
    )
    expect(wrapper.text()).toContain('Beagle')
    expect(wrapper.get('[role="img"]').attributes('style')).toContain(
      'https://cdn.example/beagle.jpg',
    )
  })

  it('loads a fresh batch after voting on the final image', async () => {
    apiMocks.getBreedImages
      .mockResolvedValueOnce([akitaImage])
      .mockResolvedValueOnce([akitaImage, beagleImage])
    const { wrapper } = await mountHome()
    await flushPromises()

    await wrapper.get('button[aria-label="Like Akita"]').trigger('click')
    await flushPromises()

    expect(apiMocks.createVote).toHaveBeenCalledWith({
      image_id: 'akita-image',
      sub_id: 'discovery-user-id',
      value: 1,
    })
    expect(apiMocks.getBreedImages).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('Beagle')
    expect(wrapper.text()).not.toContain('You met every breed!')
  })
})
