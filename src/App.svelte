<script>
	import AOEIV from "./AOEIV.svelte";
	import AOE4WORLD from "./AOE4WORLD.svelte";
	import Search from "./Search.svelte";

	const component_to_render = "AOE4WORLD";

	const url = new URL(location);
	const is_search = !url.search
	
</script>

{#if is_search}
	<Search />
{:else}
	{#if component_to_render === "AOEIV"}
		<AOEIV />
	{:else}
		<AOE4WORLD />
	{/if}
{/if}
