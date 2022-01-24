<script>
    import {onMount} from "svelte";

	const matches_url = (steam_id, matches_count = 1000) => `https://aoeiv.net/api/player/matches?game=aoe4&steam_id=${steam_id}&count=${matches_count}`;
	const rating_url = (profile_id, matches_count = 1000) => `https://aoeiv.net/api/player/ratinghistory?game=aoe4&leaderboard_id=17&profile_id=${profile_id}&count=${matches_count}`;

	let settings = {
		steam_id: "",
		civs: [],
		map_types: [],
	};

	let current_match = {};
	let current_match_loading = true;

	function get_url_info() {
		const current_url = new URL(location.href);
		const search_params = new URLSearchParams(current_url.search);

		// Available url parameters to override settings.
		const params = ["steam_id"];

		// Apply found url params to settings.
		for (let param of params) {
			if (search_params.has(param)) {
				settings[param] = search_params.get(param);
			}
		}
	}

	async function get_strings() {
		const response = await fetch("https://aoeiv.net/api/strings?game=aoe4&language=en");
		if (!response.ok) return;
		
		const json = await response.json();
		if (json.length < 1) return;

		settings.civs = json.civ;
		settings.map_types = json.map_type
	}

	async function get_current_match() {
		const current_match_url = matches_url(settings.steam_id, 1);


		const response = await fetch(current_match_url);
		if (!response.ok) return;

		const json = await response.json();
		if (json.length < 1) return;

		current_match = json[0];
	}

	async function get_current_match_info() {

		
		for (const player of current_match.players) {
			const user_rating_url = rating_url(player.profile_id, 1);
			const response = await fetch(user_rating_url);
			if (!response.ok) return;

			const json = await response.json();
			if (json.length < 1) return;

			const wins = json[0].num_wins;
			const losses = json[0].num_losses;
			const number_of_games = wins + losses;
			let winrate = (wins / number_of_games) * 100;

            // Convert float to 2 decimal.
            if (!Number.isInteger(winrate)) {
                winrate = winrate.toFixed(2);
            }

			player.my_wins = wins;
			player.my_losses = losses;
			player.my_winrate = winrate;

		}

	}

	async function get_match_data() {
		await get_current_match();
		await get_current_match_info();
	}

    onMount(async () => {
		get_url_info();

		await get_strings();
		await get_match_data();
		current_match_loading = false;
		console.log(settings.map_types);
		console.log(current_match);
	});

</script>

<main>
	{#if !current_match_loading}

		{settings.map_types[current_match.map_type].string}
		<br>
		
		{#each current_match.players as player}
			<img width="55" height="31" src={`https://raw.githubusercontent.com/FluffyMaguro/AoE4_Overlay/main/src/img/flags/${settings.civs[player.civ].string}.webp`} alt="">
			{player.name} | {player.rating} | {player.my_winrate}% | {player.my_wins}W | {player.my_losses}L
			<br>
		{/each}

	{/if}
</main>

<style>
	.civs {

	}
</style>