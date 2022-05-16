<script>
    import diff from "microdiff";
    import {onMount} from "svelte";
	import {current_match} from "./stores.js";

    const player_url = (profile_id) => `https://aoe4world.com/api/v0/players/${profile_id}`;
    const match_url = (profile_id) => `https://aoe4world.com/api/v0/players/${profile_id}/games/last`;
    const steam_url = (steam_id) => `https://steamcommunity.com/profiles/${steam_id}?xml=1`;
    

	let settings = {
		steam_id: "",
        profile_id: "",
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
		const params = ["steam_id", "profile_id"];

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
        const response = await fetch(match_url(settings.profile_id));
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

        if (!settings.steam_id && !settings.profile_id) return;

        // Use steam id to get profile id from user profile.
        if (!settings.profile_id) {
            const response = await fetch(player_url(settings.steam_id));
            const json = await response.json();
            settings.profile_id = json.profile_id;
        }

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

                                <span class="rating">{player.modes[awaited_current_match.kind].rating} rating </span>

                                (#{player.modes[awaited_current_match.kind].rank})
                                {#if player.modes[awaited_current_match.kind].rank_level}
                                    <img src={`/images/ranks/${player.modes[awaited_current_match.kind].rank_level}.png`} class="rank-icon" width="27" height="31" alt={player.modes[awaited_current_match.kind].rank_level}>
                                    {convert_to_roman(player.modes[awaited_current_match.kind].rank_level)}
                                {/if}

                                |
                                {player.modes[awaited_current_match.kind].win_rate}%
                                <svg xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 24 24" class="winrate-icon"><path fill="#fff" d="M5 0c0 9.803 5.105 12.053 5.604 16h2.805c.497-3.947 5.591-6.197 5.591-16h-14zm7.006 14.62c-.408-.998-.969-1.959-1.548-2.953-1.422-2.438-3.011-5.162-3.379-9.667h9.842c-.368 4.506-1.953 7.23-3.372 9.669-.577.993-1.136 1.954-1.543 2.951zm-.006-3.073c-1.125-2.563-1.849-5.599-1.857-8.547h-1.383c.374 3.118 1.857 7.023 3.24 8.547zm12-9.547c-.372 4.105-2.808 8.091-6.873 9.438.297-.552.596-1.145.882-1.783 2.915-1.521 4.037-4.25 4.464-6.251h-2.688c.059-.45.103-.922.139-1.405h4.076zm-24 0c.372 4.105 2.808 8.091 6.873 9.438-.297-.552-.596-1.145-.882-1.783-2.915-1.521-4.037-4.25-4.464-6.251h2.688c-.058-.449-.102-.922-.138-1.404h-4.077zm13.438 15h-2.866c-.202 1.187-1.63 2.619-3.571 2.619v4.381h10v-4.381c-1.999 0-3.371-1.432-3.563-2.619zm2.562 6h-8v-2h8v2z"></path></svg>
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
        font-size: 22px;
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
        white-space: nowrap;
    }

    .civ-flag {
        margin-right: 10px;
    }

    .rating {
        color: rgb(175 148 78);
        color: #D2AF26;
        margin-left: 5px;
        margin-right: 5px;
    }

    .rank-icon {
        margin-left: 5px;
        margin-right: 5px;
    }

    .winrate-icon {
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