<script>
    import diff from "microdiff";
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

    async function set_current_match() {
        const saved_current_match = $current_match;
        const awaited_current_match = await get_current_match();

        const changes = diff(saved_current_match, awaited_current_match);
        if (changes.length > 0) {
            $current_match = awaited_current_match;
        }
    }

    async function get_current_match() {
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

    function convert_to_roman(text) {
        const [new_text, number] = text.split("_");
        const roman_number = get_roman_number(number);

        return `${new_text} ${roman_number}`;
    }

    function get_roman_number(number) {
        if (number < 1) return "";
        if (number >= 4) return "IV" + get_roman_number(number - 4);
        if (number >= 1) return "I" + get_roman_number(number - 1);
    }

    onMount(async () => {
		get_url_info();

        set_current_match();
		start_periodic_check();
	});

</script>

<main class="overlay">
    {#await $current_match then awaited_current_match}

        <div class="match-info">
            Map: {awaited_current_match.map} | Server: {awaited_current_match.server}
        </div>

        {#if awaited_current_match.teams}
            <div class="teams">
                {#each awaited_current_match.teams as team}
                    <div class="team">
                        {#each team as player}
                            <div class="player">
                                <img src={`/images/flags/small/${player.civilization}.jpg`} class="civ-flag" width="55" height="31" alt={player.civilization}>
                                {player.name}
                                |

                                {player.modes[awaited_current_match.kind].rating} rating 
                                {#if player.modes[awaited_current_match.kind].rank_level}
                                    <img src={`/images/ranks/${player.modes[awaited_current_match.kind].rank_level}.png`} class="rank-icon" width="27" height="31" alt={player.modes[awaited_current_match.kind].rank_level}>
                                    {convert_to_roman(player.modes[awaited_current_match.kind].rank_level)}
                                {/if}

                                |
                                {player.modes[awaited_current_match.kind].win_rate}% winrate
                                |

                                <span class="win">{player.modes[awaited_current_match.kind].wins_count}W</span>
                                &nbsp;
                                <span class="loss">{player.modes[awaited_current_match.kind].losses_count}L</span>
                            </div>
                        {/each}
                    </div>
                {/each}
            </div>
        {/if}

	{/await}
</main>

<style>
    .overlay {
        font-size: 20px;
        text-shadow: black 0px 0px 2px;
    }

    .match-info {
        margin-bottom: 10px;
    }

    .team {
        margin-bottom: 8px;
    }

    .player {
        display: flex;
        align-items: center;
    }

    .civ-flag {
        margin-right: 10px;
    }

    .rank-icon {
        margin-left: 5px;
        margin-right: 5px;
    }

    .win {
        color: rgb(34 197 94);
        margin-left: 5px;
    }

    .loss {
        color: rgb(239 68 68);
    }
</style>