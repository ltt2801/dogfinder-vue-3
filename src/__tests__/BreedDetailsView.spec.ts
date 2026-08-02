import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { DogBreed, DogImage } from '@/models/dog'
import type { CreateVoteRequest } from '@/models/vote'
import BreedDetailsView from '@/views/BreedDetailsView.vue'

const apiMocks = vi.hoisted(() => ({
  getBreedImages: vi.fn<() => Promise<DogImage[]>>(),
  getInfoByBreedId: vi.fn<(breedId: number) => Promise<DogBreed>>(),
  createVote: vi.fn<(payload: CreateVoteRequest) => Promise<unknown>>(),
}))

vi.mock('@/services/dogApi', () => ({
  dogApi: apiMocks,
}))

const akita: DogBreed = {
  id: 6,
  name: 'Akita',
  weight: { imperial: '65 - 115', metric: '29 - 52' },
  height: { imperial: '24 - 28', metric: '61 - 71' },
  bred_for: 'Hunting bears',
  breed_group: 'Working',
  life_span: '10 - 14 years',
  temperament: 'Docile, Alert, Responsive, Dignified',
  image: {
    id: 'akita-image',
    url: 'https://cdn.example/akita.jpg',
  },
}

const mountDetails = async (id: string) => {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<p>Discovery</p>' } },
      { path: '/breeds/:id', component: BreedDetailsView, props: true },
    ],
  })

  await router.push(`/breeds/${id}`)
  await router.isReady()

  const wrapper = mount(BreedDetailsView, {
    props: { id },
    global: {
      plugins: [pinia, router],
      stubs: {
        'p-skeleton': { template: '<div class="p-skeleton" />' },
      },
    },
  })

  return { wrapper, router }
}

describe('BreedDetailsView', () => {
  beforeEach(() => {
    localStorage.clear()
    apiMocks.getBreedImages.mockReset()
    apiMocks.getInfoByBreedId.mockReset().mockResolvedValue(akita)
    apiMocks.createVote.mockReset()
  })

  it('loads a direct URL and displays every required breed field', async () => {
    apiMocks.getInfoByBreedId.mockResolvedValueOnce({
      ...akita,
      id: '6',
    } as unknown as DogBreed)

    const { wrapper } = await mountDetails('6')
    await flushPromises()

    expect(apiMocks.getInfoByBreedId).toHaveBeenCalledExactlyOnceWith(6)
    expect(apiMocks.getBreedImages).not.toHaveBeenCalled()
    expect(wrapper.get('h1').text()).toBe('Akita')
    expect(wrapper.get('img').attributes()).toMatchObject({
      src: 'https://cdn.example/akita.jpg',
      alt: 'Akita dog',
    })
    expect(wrapper.text()).toContain('29 - 52 kg')
    expect(wrapper.text()).toContain('61 - 71 cm')
    expect(wrapper.text()).toContain('Hunting bears')
    expect(wrapper.text()).toContain('Working')
    expect(wrapper.text()).toContain('10 - 14 years')
    expect(wrapper.text()).toContain('Docile, Alert, Responsive, Dignified')
  })

  it('uses accessible fallbacks when optional details and the image are missing', async () => {
    apiMocks.getInfoByBreedId.mockResolvedValueOnce({
      id: 7,
      name: 'Unknown Dog',
      weight: { imperial: '', metric: '' },
      height: { imperial: '', metric: '' },
    })

    const { wrapper } = await mountDetails('7')
    await flushPromises()

    expect(wrapper.text()).toContain('Unknown Dog')
    expect(wrapper.text().match(/Not available/g)).toHaveLength(6)
    expect(wrapper.get('[role="img"]').attributes('aria-label')).toBe('Unknown Dog')
    expect(wrapper.text()).toContain('No image available')
  })

  it('shows a not-found state for an unknown breed id', async () => {
    apiMocks.getInfoByBreedId.mockRejectedValueOnce(
      Object.assign(new Error('Breed not found'), { status: 404 }),
    )
    const { wrapper } = await mountDetails('999')
    await flushPromises()

    expect(wrapper.text()).toContain('Breed not found')
    expect(wrapper.text()).toContain('This breed does not exist')
  })

  it('rejects an invalid route id without requesting the API', async () => {
    const { wrapper } = await mountDetails('not-a-number')
    await flushPromises()

    expect(apiMocks.getInfoByBreedId).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Breed not found')
  })

  it('shows API errors and retries loading the breed', async () => {
    apiMocks.getInfoByBreedId.mockRejectedValueOnce(new Error('Dog service is unavailable'))
    const { wrapper } = await mountDetails('6')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('Dog service is unavailable')

    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(apiMocks.getInfoByBreedId).toHaveBeenCalledTimes(2)
    expect(wrapper.get('h1').text()).toBe('Akita')
  })
})
