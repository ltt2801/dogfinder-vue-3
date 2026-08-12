<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string;
    message: string;
    actionLabel?: string;
    isError?: boolean;
  }>(),
  {
    actionLabel: undefined,
    isError: false,
  },
);

const emit = defineEmits<{
  action: [];
}>();
</script>

<template>
  <p-card
    class="w-full max-w-[34rem] mx-auto text-center shadow-xl"
    :role="isError ? 'alert' : 'status'"
    aria-live="polite"
  >
    <template #content>
      <div class="flex flex-col items-center px-3 py-6 sm:px-8 sm:py-10">
        <p-message class="mb-5 w-full" :severity="isError ? 'error' : 'success'" :closable="false">
          {{ title }}
        </p-message>
        <p class="m-0 max-w-md leading-7 text-[var(--color-text-muted)]">
          {{ message }}
        </p>
        <p-button
          v-if="actionLabel"
          class="mt-6"
          :label="actionLabel"
          :severity="isError ? 'danger' : 'primary'"
          rounded
          @click="emit('action')"
        />
      </div>
    </template>
  </p-card>
</template>
