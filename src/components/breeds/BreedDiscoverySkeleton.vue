<template>
  <p-card
    class="breed-card h-full max-h-full w-full mb-7 select-none overflow-hidden shadow-xl"
    role="status"
    aria-label="Loading dog breeds"
    :pt="{
      body: { class: '!p-0' },
      content: { class: '!p-0' },
    }"
  >
    <template #content>
      <p-skeleton width="100%" height="480px" border-radius="0" />
      <div class="space-y-3 p-5">
        <p-skeleton width="32%" height="0.625rem" border-radius="999px" />
        <p-skeleton width="62%" height="2rem" border-radius="999px" />
        <p-skeleton width="100%" height="0.875rem" border-radius="999px" />
        <p-skeleton width="78%" height="0.875rem" border-radius="999px" />
      </div>
      <span class="sr-only">Loading dog breeds…</span>
    </template>
  </p-card>
</template>
