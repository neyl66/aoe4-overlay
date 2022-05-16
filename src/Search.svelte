<script>
    const search_url = (search) => `https://aoe4world.com/api/v0/players/autocomplete?leaderboard=rm_1v1&query=${search}`;
    const steam_url = (steam_id) => `https://steamcommunity.com/profiles/${steam_id}?xml=1`;

    let found_players = [];
    let search_value = "";

    const search_players = debounce(async (event) => {
        if (!search_value) return;

        const response = await fetch(search_url(search_value));
        if (!response.ok) return;

        const json = await response.json();

        console.log(json);
        found_players = json.players;

    }, 250);

    function debounce(callback, wait) {
        let timeout_id = null;
        return (...args) => {
            window.clearTimeout(timeout_id);
            timeout_id = window.setTimeout(() => {
                callback.apply(null, args);
            }, wait);
        };
    }

</script>

<input type="text" placeholder="search players" bind:value={search_value} on:input={search_players}>

{#if found_players.length > 0}
    <div class="found-players">
        {#each found_players as player}
            <div class="player">
                <a href="/?profile_id={player.profile_id}">{player.name}</a>
            </div>
        {/each}
    </div>
{/if}

<style>
    .player a {
        color: #fff;
        text-decoration: underline;
    }
</style>