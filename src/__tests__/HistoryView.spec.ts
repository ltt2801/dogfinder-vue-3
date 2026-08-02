import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { DogBreed, DogImage } from '@/models/dog'
import type { Vote } from '@/models/vote'
import HistoryView from '@/views/HistoryView.vue'

const apiMocks = vi.hoisted(() => ({
  getVoteBySubId: vi.fn<(subId: string) => Promise<Vote[]>>(),
  getImageById: vi.fn<(imageId: string) => Promise<DogImage>>(),
  getInfoByBreedId: vi.fn<(breedId: number) => Promise<DogBreed>>(),
  deleteVote: vi.fn<(voteId: number) => Promise<void>>(),
}))

interface ConfirmRequireOptions {
  message: string
  accept?: () => void
  reject?: () => void
}

const confirmMocks = vi.hoisted(() => ({
  require: vi.fn<(options: ConfirmRequireOptions) => void>(),
}))

vi.mock('@/services/dogApi', () => ({
  dogApi: apiMocks,
}))

vi.mock('primevue/useconfirm', () => ({
  useConfirm: () => confirmMocks,
}))

vi.mock('@faker-js/faker', () => ({
  faker: {
    person: { fullName: () => 'History User' },
    string: { uuid: () => 'history-user-id' },
  },
}))

const votes: Vote[] = [
  { id: 1, image_id: 'image-dislike', sub_id: 'history-user-id', value: -1 },
  { id: 2, image_id: 'image-like', sub_id: 'history-user-id', value: 1 },
  { id: 3, image_id: 'image-super-like', sub_id: 'history-user-id', value: 2 },
]

const mountHistory = async () => {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<p>Home</p>' } },
      { path: '/history', component: HistoryView },
    ],
  })

  await router.push('/history')
  await router.isReady()

  return mount(HistoryView, {
    global: {
      plugins: [pinia, router],
    },
  })
}

describe('HistoryView', () => {
  beforeEach(() => {
    localStorage.clear()
    apiMocks.getVoteBySubId.mockReset().mockResolvedValue(votes)
    apiMocks.getImageById.mockReset().mockImplementation(async (imageId) => ({
      id: imageId,
      url: `https://cdn.example/${imageId}.jpg`,
      breeds: [{ id: 1, name: `Breed for ${imageId}` }],
    }))
    apiMocks.getInfoByBreedId.mockReset().mockResolvedValue({
      id: 1,
      name: 'Akita',
      bred_for: 'Hunting',
      breed_group: 'Working',
      weight: { imperial: '65 - 115', metric: '29 - 52' },
      height: { imperial: '24 - 28', metric: '61 - 71' },
      life_span: '10 - 14 years',
      temperament: 'Docile, Alert, Responsive, Dignified',
    })
    apiMocks.deleteVote.mockReset().mockResolvedValue(undefined)
    confirmMocks.require.mockReset()
  })

  it('loads every vote and its image and displays the matching badges', async () => {
    const wrapper = await mountHistory()
    await flushPromises()

    expect(apiMocks.getVoteBySubId).toHaveBeenCalledWith('history-user-id')
    expect(apiMocks.getImageById).toHaveBeenCalledTimes(3)
    expect(apiMocks.getImageById).toHaveBeenNthCalledWith(1, 'image-dislike')
    expect(apiMocks.getImageById).toHaveBeenNthCalledWith(2, 'image-like')
    expect(apiMocks.getImageById).toHaveBeenNthCalledWith(3, 'image-super-like')

    expect(wrapper.findAll('.breed-card')).toHaveLength(3)
    expect(wrapper.get('.p-badge-danger').text()).toBe('Dislike')
    expect(wrapper.get('.p-badge-success').text()).toBe('Like')
    expect(wrapper.get('.p-badge-info').text()).toBe('Super Like')
    expect(wrapper.find('[aria-label="Choose this breed"]').exists()).toBe(false)
  })

  it('fetches the full breed info and opens/closes the details overlay on click', async () => {
    const wrapper = await mountHistory()
    await flushPromises()

    const card = wrapper.findAll('.breed-card')[0]!
    expect(wrapper.find('[role="region"]').exists()).toBe(false)
    expect(apiMocks.getInfoByBreedId).not.toHaveBeenCalled()

    await card.trigger('click')
    await flushPromises()

    expect(apiMocks.getInfoByBreedId).toHaveBeenCalledTimes(1)
    expect(apiMocks.getInfoByBreedId).toHaveBeenCalledWith(1)
    const details = wrapper.get('[role="region"]')
    expect(details.text()).toContain('Breed Name')
    expect(details.text()).toContain('Akita')
    expect(details.text()).toContain('Hunting')
    expect(details.text()).toContain('Docile, Alert, Responsive, Dignified')

    await card.trigger('click')
    await flushPromises()

    expect(wrapper.find('[role="region"]').exists()).toBe(false)

    await card.trigger('click')
    await flushPromises()

    expect(apiMocks.getInfoByBreedId).toHaveBeenCalledTimes(1)
  })

  it('shows a confirmation popup and deletes the vote once accepted', async () => {
    const wrapper = await mountHistory()
    await flushPromises()

    expect(wrapper.findAll('.breed-card')).toHaveLength(3)

    await wrapper
      .get('button[aria-label="Delete vote for Breed for image-dislike"]')
      .trigger('click')

    expect(confirmMocks.require).toHaveBeenCalledTimes(1)
    expect(apiMocks.deleteVote).not.toHaveBeenCalled()

    const options = confirmMocks.require.mock.calls[0]![0]
    expect(options.message).toContain('Delete this vote')

    options.accept?.()
    await flushPromises()

    expect(apiMocks.deleteVote).toHaveBeenCalledWith(1)
    expect(wrapper.findAll('.breed-card')).toHaveLength(2)
    expect(wrapper.text()).not.toContain('Breed for image-dislike')
  })

  it('shows an error message when deleting a vote fails', async () => {
    apiMocks.deleteVote.mockRejectedValueOnce(new Error('Could not delete vote'))
    const wrapper = await mountHistory()
    await flushPromises()

    await wrapper
      .get('button[aria-label="Delete vote for Breed for image-dislike"]')
      .trigger('click')

    const options = confirmMocks.require.mock.calls[0]![0]
    options.accept?.()
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('Could not delete vote')
    expect(wrapper.findAll('.breed-card')).toHaveLength(3)
  })

  it('shows an empty state when the user has no votes', async () => {
    apiMocks.getVoteBySubId.mockResolvedValueOnce([])
    const wrapper = await mountHistory()
    await flushPromises()

    expect(wrapper.text()).toContain('No votes yet')
    expect(apiMocks.getImageById).not.toHaveBeenCalled()
  })
})
