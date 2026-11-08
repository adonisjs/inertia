<script lang="ts">
  let { user, title }: { user?: { name: string }; title?: string } = $props()
</script>

<svelte:head>
  <title>{title ?? user?.name ?? 'Default Title'}</title>
</svelte:head>

<main>
  <h1>Hello {user?.name ?? 'Guest'}</h1>
</main>
