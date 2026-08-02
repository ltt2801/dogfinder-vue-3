<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useConfirm } from 'primevue/useconfirm'
import IconArrowLeft from '~icons/lucide/arrow-left'

import BreedDiscoveryCard from '@/components/breeds/BreedDiscoveryCard.vue'
import BreedDiscoveryState from '@/components/breeds/BreedDiscoveryState.vue'
import type { DogImage } from '@/models/dog'
import type { Vote } from '@/models/vote'
import { dogApi } from '@/services/dogApi'
import { useUserStore } from '@/stores/user'

interface VoteHistoryItem {
  vote: Vote
  image: DogImage
}

const confirm = useConfirm()

const historyItems = ref<VoteHistoryItem[]>([])
const isLoading = ref(false)
const loadError = ref<string | null>(null)
const hasLoaded = ref(false)
const deletingVoteId = ref<number | null>(null)
const deleteError = ref<string | null>(null)

const loadHistory = async () => {
  if (isLoading.value) {
    return
  }

  isLoading.value = true
  loadError.value = null

  try {
    const user = useUserStore().initializeUser()
    const votes = await dogApi.getVoteBySubId(user.subId)
    const imageResults = await Promise.allSettled(
      votes.map(async (vote) => ({
        vote,
        image: await dogApi.getImageById(vote.image_id),
      })),
    )

    historyItems.value = imageResults.flatMap((result) =>
      result.status === 'fulfilled' ? [result.value] : [],
    )
    hasLoaded.value = true
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : 'An unexpected error occurred.'
  } finally {
    isLoading.value = false
  }
}

const deleteHistoryItem = async (item: VoteHistoryItem) => {
  if (deletingVoteId.value !== null) {
    return
  }

  deletingVoteId.value = item.vote.id
  deleteError.value = null

  try {
    await dogApi.deleteVote(item.vote.id)
    historyItems.value = historyItems.value.filter(
      (historyItem) => historyItem.vote.id !== item.vote.id,
    )
  } catch (error) {
    deleteError.value = error instanceof Error ? error.message : 'Failed to delete the vote.'
  } finally {
    deletingVoteId.value = null
  }
}

const confirmDeleteHistoryItem = (event: MouseEvent, item: VoteHistoryItem) => {
  confirm.require({
    target: event.currentTarget as HTMLElement,
    message: 'Delete this vote? This action cannot be undone.',
    icon: 'pi pi-exclamation-triangle',
    acceptProps: {
      label: 'Delete',
      severity: 'danger',
    },
    rejectProps: {
      label: 'Cancel',
      severity: 'secondary',
      outlined: true,
    },
    accept: () => {
      void deleteHistoryItem(item)
    },
  })
}

onMounted(loadHistory)
</script>

<template>
  <section class="pt-6 mx-auto w-full max-w-[80rem]" aria-labelledby="history-heading">
    <p-confirm-popup />

    <RouterLink
      class="mb-6 inline-flex items-center gap-2 font-bold text-[var(--color-primary-dark)] underline-offset-4"
      to="/"
      aria-label="Back to breed discovery"
    >
      <IconArrowLeft class="h-4 w-4" />
      Back to Home
    </RouterLink>

    <header class="mb-8 text-center">
      <h1
        id="history-heading"
        class="m-0 font-[750] tracking-[0.08em] text-[var(--color-primary-dark)] uppercase"
      >
        Vote history
      </h1>
      <p class="mt-2 mb-0 text-[var(--color-text-muted)]">Review every dog you have rated.</p>
    </header>

    <div
      v-if="isLoading || (!hasLoaded && !loadError)"
      class="grid gap-6 md:grid-cols-2 xl:grid-cols-3"
      role="status"
      aria-label="Loading vote history"
    >
      <p-skeleton
        v-for="index in 3"
        :key="index"
        class="!h-[38rem] !rounded-[var(--radius-card)]"
      />
    </div>

    <BreedDiscoveryState
      v-else-if="loadError"
      title="We could not load your vote history"
      :message="loadError"
      action-label="Try again"
      is-error
      @action="loadHistory"
    />

    <BreedDiscoveryState
      v-else-if="historyItems.length === 0"
      title="No votes yet"
      message="Start discovering dogs and your votes will appear here."
      action-label="Discover dogs"
      @action="$router.push('/')"
    />

    <template v-else>
      <p-message v-if="deleteError" class="mb-6" severity="error" :closable="false" role="alert">
        {{ deleteError }}
      </p-message>

      <div class="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <BreedDiscoveryCard
          v-for="item in historyItems"
          :key="item.vote.id"
          class="h-[38rem]"
          :image="item.image"
          :is-voting="false"
          :interactive="false"
          :show-vote-actions="false"
          :show-delete-action="true"
          :is-deleting="deletingVoteId === item.vote.id"
          :vote-value="item.vote.value"
          @delete="confirmDeleteHistoryItem($event, item)"
        />
      </div>
    </template>
  </section>
</template>
