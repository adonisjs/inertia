<script lang="ts">
  import type { Snippet } from 'svelte'

  let { children }: { children?: Snippet } = $props()
</script>

<div class="layout">
  <nav>Navigation Bar</nav>
  {@render children?.()}
  <footer>Page Footer</footer>
</div>
