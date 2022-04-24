import {writable} from "svelte/store";

/*export const filters = writable({
    all: false,
    pickable_all: true,
    value: "",
});

export const spells = writable([]);*/
export const current_match = writable({});



// from: https://chasingcode.dev/blog/svelte-persist-state-to-localstorage/
/*const stored_theme = localStorage.getItem("theme") ?? "light";
export const theme = writable(stored_theme);
theme.subscribe(value => {
    localStorage.setItem("theme", value);
});*/
