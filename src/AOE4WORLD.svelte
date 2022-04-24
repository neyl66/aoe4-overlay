<script>
    import {onMount} from "svelte";
	import {current_match} from "./stores.js";

	//const matches_url = (steam_id, matches_count = 1000) => `https://aoeiv.net/api/player/matches?game=aoe4&steam_id=${steam_id}&count=${matches_count}`;
	//const rating_url = (profile_id, matches_count = 1000) => `https://aoeiv.net/api/player/ratinghistory?game=aoe4&leaderboard_id=17&profile_id=${profile_id}&count=${matches_count}`;
    const match_url = (profile_id) => `https://aoe4world.com/api/v0/players/${profile_id}/games/last`;

	let settings = {
		steam_id: "",
		civs: [],
		map_types: [],
        periodic_check: {
            timer: 0,
            interval: 20 * 1000,
        },
	};

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

    function set_current_match() {
        $current_match = get_current_match().then((awaited_current_match) => {
            $current_match = awaited_current_match;
            console.log(awaited_current_match);
        });
    }

    async function get_current_match() {
        console.log(settings.steam_id);
        const response = await fetch(match_url(settings.steam_id));
        const json = await response.json();

        return json;
    }

	function start_periodic_check() {
		if (settings.periodic_check.timer) {
			return;
		}

		// Refresh data on interval.
		settings.periodic_check.timer = setInterval(() => {
			set_current_match();
		}, settings.periodic_check.interval);
	}

	window.stop_periodic_check = () => {
		clearInterval(settings.periodic_check.timer);
		settings.periodic_check.timer = 0;
	}

    onMount(async () => {
		get_url_info();

        set_current_match();
		start_periodic_check();
	});

    console.log($current_match);

</script>

<main>
    {#await $current_match then awaited_current_match}

        <div class="match-info">
            {awaited_current_match.map} | Server: {awaited_current_match.server}
        </div>

        {#if awaited_current_match.teams}
            <div class="teams">
                {#each awaited_current_match.teams as team}
                    <div class="team">
                        {#each team as player}
                            <div class="player">
                                <img width="55" height="31" src={`/images/flags/small/${player.civilization}.jpg`} alt={player.civilization}>
                                {player.name} | {player.modes[awaited_current_match.kind].rating} rating ({player.modes[awaited_current_match.kind].rank_level}) | {player.modes[awaited_current_match.kind].win_rate}% winrate | {player.modes[awaited_current_match.kind].wins_count}W | {player.modes[awaited_current_match.kind].losses_count}L
                            </div>
                        {/each}
                    </div>
                {/each}
            </div>
        {/if}

	{/await}
</main>

<style>
    .match-info {
        margin-bottom: 10px;
    }

	.teams {

	}
    .team {
        margin-bottom: 5px;
    }
    .player {
        display: flex;
        align-items: center;
    }
    .player img {
        margin-right: 10px;
    }
</style>