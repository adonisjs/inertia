<script setup lang="ts">
import { Form } from '../../src/client/vue/form.ts'
</script>

<template>
  <Form
    route="users.store"
    :reset-on-success="['email', 'remember']"
    :reset-on-error="['email']"
    :transform="(data) => ({ ...data, email: data.email.trim() })"
    v-slot="{ errors, getData, reset }"
  >
    {{ errors.email }}
    {{ getData().email }}
    <button type="button" @click="reset('email', 'remember')">Reset</button>

    <!-- @vue-expect-error unknown route body field -->
    {{ errors.unknown }}
    <!-- @vue-expect-error unknown route body field -->
    {{ getData().unknown }}
    <!-- @vue-expect-error unknown route body field -->
    <button type="button" @click="reset('unknown')">Invalid reset</button>
  </Form>

  <Form :action="{ url: '/users', method: 'post' }" v-slot="{ errors, getData, reset }">
    {{ errors.anyField }}
    {{ getData().anyField }}
    <button type="button" @click="reset('anyField')">Reset</button>
  </Form>
</template>
