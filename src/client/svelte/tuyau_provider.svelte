<!--
  @adonisjs/inertia

  (c) AdonisJS

  For the full copyright and license information, please view the LICENSE
  file that was distributed with this source code.
-->
<!--
  @component
  Provider component that makes the Tuyau client available to child components.

  Wrap the part of your application that needs type-safe routing. When the
  Inertia app is mounted without a component of your own around it, seed the
  client through `tuyauContext` on `mount()` instead.

  @example
  ```svelte
  <TuyauProvider client={tuyau}>
    <App {...props} />
  </TuyauProvider>
  ```
-->
<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { Tuyau } from '@tuyau/core/client'
  import type { TuyauRegistry } from '@tuyau/core/types'

  import { setTuyau } from './internals.js'

  const {
    client,
    children,
  }: {
    client: Tuyau<TuyauRegistry>
    children?: Snippet
  } = $props()

  /**
   * Seeds the context once with whatever client is passed in. The provider
   * is not meant to react to `client` being swapped out for a different
   * instance post-mount (the same contract React/Vue's TuyauProvider make
   * implicitly, since neither re-runs its own context registration either);
   * the compiler cannot know that statically, hence the ignore.
   */
  // svelte-ignore state_referenced_locally
  setTuyau(client)
</script>

{@render children?.()}
