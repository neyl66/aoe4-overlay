<script>
	import AOEIV from "./AOEIV.svelte";
	import AOE4WORLD from "./AOE4WORLD.svelte";

	const component_to_render = "AOE4WORLD";
</script>

{#if component_to_render === "AOEIV"}
	<AOEIV />
{:else}
	<AOE4WORLD />
{/if}
