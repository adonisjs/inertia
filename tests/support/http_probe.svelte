<!--
  @adonisjs/inertia

  (c) AdonisJS

  For the full copyright and license information, please view the LICENSE
  file that was distributed with this source code.
-->
<script lang="ts">
  import { useHttp } from '../../src/client/svelte/http.ts'

  let { onReady }: { onReady: (http: typeof useHttp) => void } = $props()
  onReady(useHttp)
</script>

<p>ready</p>
