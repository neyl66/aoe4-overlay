
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function is_promise(value) {
        return value && typeof value === 'object' && typeof value.then === 'function';
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function set_store_value(store, ret, value) {
        store.set(value);
        return ret;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function handle_promise(promise, info) {
        const token = info.token = {};
        function update(type, index, key, value) {
            if (info.token !== token)
                return;
            info.resolved = value;
            let child_ctx = info.ctx;
            if (key !== undefined) {
                child_ctx = child_ctx.slice();
                child_ctx[key] = value;
            }
            const block = type && (info.current = type)(child_ctx);
            let needs_flush = false;
            if (info.block) {
                if (info.blocks) {
                    info.blocks.forEach((block, i) => {
                        if (i !== index && block) {
                            group_outros();
                            transition_out(block, 1, 1, () => {
                                if (info.blocks[i] === block) {
                                    info.blocks[i] = null;
                                }
                            });
                            check_outros();
                        }
                    });
                }
                else {
                    info.block.d(1);
                }
                block.c();
                transition_in(block, 1);
                block.m(info.mount(), info.anchor);
                needs_flush = true;
            }
            info.block = block;
            if (info.blocks)
                info.blocks[index] = block;
            if (needs_flush) {
                flush();
            }
        }
        if (is_promise(promise)) {
            const current_component = get_current_component();
            promise.then(value => {
                set_current_component(current_component);
                update(info.then, 1, info.value, value);
                set_current_component(null);
            }, error => {
                set_current_component(current_component);
                update(info.catch, 2, info.error, error);
                set_current_component(null);
                if (!info.hasCatch) {
                    throw error;
                }
            });
            // if we previously had a then/catch block, destroy it
            if (info.current !== info.pending) {
                update(info.pending, 0);
                return true;
            }
        }
        else {
            if (info.current !== info.then) {
                update(info.then, 1, info.value, promise);
                return true;
            }
            info.resolved = promise;
        }
    }
    function update_await_block_branch(info, ctx, dirty) {
        const child_ctx = ctx.slice();
        const { resolved } = info;
        if (info.current === info.then) {
            child_ctx[info.value] = resolved;
        }
        if (info.current === info.catch) {
            child_ctx[info.error] = resolved;
        }
        info.block.p(child_ctx, dirty);
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.46.2' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\AOEIV.svelte generated by Svelte v3.46.2 */

    const { Object: Object_1, console: console_1 } = globals;
    const file$1 = "src\\AOEIV.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[11] = list[i];
    	return child_ctx;
    }

    // (132:1) {#if current_match?.loaded}
    function create_if_block$2(ctx) {
    	let t0_value = /*settings*/ ctx[0].map_types[/*current_match*/ ctx[1].map_type].string + "";
    	let t0;
    	let t1;
    	let br;
    	let t2;
    	let each_1_anchor;
    	let each_value = /*current_match*/ ctx[1].players;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			t0 = text(t0_value);
    			t1 = space();
    			br = element("br");
    			t2 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			add_location(br, file$1, 134, 2, 3450);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, br, anchor);
    			insert_dev(target, t2, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*settings, current_match*/ 3 && t0_value !== (t0_value = /*settings*/ ctx[0].map_types[/*current_match*/ ctx[1].map_type].string + "")) set_data_dev(t0, t0_value);

    			if (dirty & /*current_match, settings*/ 3) {
    				each_value = /*current_match*/ ctx[1].players;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(br);
    			if (detaching) detach_dev(t2);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(132:1) {#if current_match?.loaded}",
    		ctx
    	});

    	return block;
    }

    // (137:2) {#each current_match.players as player}
    function create_each_block$1(ctx) {
    	let img;
    	let img_src_value;
    	let t0;
    	let t1_value = /*player*/ ctx[11].name + "";
    	let t1;
    	let t2;
    	let t3_value = /*player*/ ctx[11].rating + "";
    	let t3;
    	let t4;
    	let t5_value = /*player*/ ctx[11].my_winrate + "";
    	let t5;
    	let t6;
    	let t7_value = /*player*/ ctx[11].my_wins + "";
    	let t7;
    	let t8;
    	let t9_value = /*player*/ ctx[11].my_losses + "";
    	let t9;
    	let t10;
    	let br;

    	const block = {
    		c: function create() {
    			img = element("img");
    			t0 = space();
    			t1 = text(t1_value);
    			t2 = text(" | ");
    			t3 = text(t3_value);
    			t4 = text(" | ");
    			t5 = text(t5_value);
    			t6 = text("% | ");
    			t7 = text(t7_value);
    			t8 = text("W | ");
    			t9 = text(t9_value);
    			t10 = text("L\r\n\t\t\t");
    			br = element("br");
    			attr_dev(img, "width", "55");
    			attr_dev(img, "height", "31");
    			if (!src_url_equal(img.src, img_src_value = `https://raw.githubusercontent.com/FluffyMaguro/AoE4_Overlay/main/src/img/flags/${/*settings*/ ctx[0].civs[/*player*/ ctx[11].civ].string}.webp`)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "");
    			add_location(img, file$1, 137, 3, 3506);
    			add_location(br, file$1, 139, 3, 3775);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, t6, anchor);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, t8, anchor);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, t10, anchor);
    			insert_dev(target, br, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*settings, current_match*/ 3 && !src_url_equal(img.src, img_src_value = `https://raw.githubusercontent.com/FluffyMaguro/AoE4_Overlay/main/src/img/flags/${/*settings*/ ctx[0].civs[/*player*/ ctx[11].civ].string}.webp`)) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty & /*current_match*/ 2 && t1_value !== (t1_value = /*player*/ ctx[11].name + "")) set_data_dev(t1, t1_value);
    			if (dirty & /*current_match*/ 2 && t3_value !== (t3_value = /*player*/ ctx[11].rating + "")) set_data_dev(t3, t3_value);
    			if (dirty & /*current_match*/ 2 && t5_value !== (t5_value = /*player*/ ctx[11].my_winrate + "")) set_data_dev(t5, t5_value);
    			if (dirty & /*current_match*/ 2 && t7_value !== (t7_value = /*player*/ ctx[11].my_wins + "")) set_data_dev(t7, t7_value);
    			if (dirty & /*current_match*/ 2 && t9_value !== (t9_value = /*player*/ ctx[11].my_losses + "")) set_data_dev(t9, t9_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(img);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(t7);
    			if (detaching) detach_dev(t8);
    			if (detaching) detach_dev(t9);
    			if (detaching) detach_dev(t10);
    			if (detaching) detach_dev(br);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(137:2) {#each current_match.players as player}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let main;
    	let if_block = /*current_match*/ ctx[1]?.loaded && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			if (if_block) if_block.c();
    			add_location(main, file$1, 130, 0, 3353);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			if (if_block) if_block.m(main, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*current_match*/ ctx[1]?.loaded) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$2(ctx);
    					if_block.c();
    					if_block.m(main, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('AOEIV', slots, []);
    	const matches_url = (steam_id, matches_count = 1000) => `https://aoeiv.net/api/player/matches?game=aoe4&steam_id=${steam_id}&count=${matches_count}`;
    	const rating_url = (profile_id, matches_count = 1000) => `https://aoeiv.net/api/player/ratinghistory?game=aoe4&leaderboard_id=17&profile_id=${profile_id}&count=${matches_count}`;

    	let settings = {
    		steam_id: "",
    		civs: [],
    		map_types: [],
    		periodic_check: { timer: 0, interval: 20 * 1000 }
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
    				$$invalidate(0, settings[param] = search_params.get(param), settings);
    			}
    		}
    	}

    	async function get_strings() {
    		const response = await fetch("https://aoeiv.net/api/strings?game=aoe4&language=en");
    		if (!response.ok) return;
    		const json = await response.json();
    		if (json.length < 1) return;
    		$$invalidate(0, settings.civs = json.civ, settings);
    		$$invalidate(0, settings.map_types = json.map_type, settings);
    	}

    	async function get_current_match() {
    		const current_match_url = matches_url(settings.steam_id, 1);
    		const response = await fetch(current_match_url);
    		if (!response.ok) return;
    		const json = await response.json();
    		if (json.length < 1) return;
    		const [new_match] = json;

    		if (Object.keys(current_match).length === 0 || new_match.match_id !== current_match?.match_id) {
    			$$invalidate(1, current_match = new_match);
    		}
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
    			let winrate = wins / number_of_games * 100;

    			// Convert float to 2 decimal.
    			if (!Number.isInteger(winrate)) {
    				winrate = winrate.toFixed(2);
    			}

    			player.my_wins = wins;
    			player.my_losses = losses;
    			player.my_winrate = winrate;
    		}

    		$$invalidate(1, current_match.loaded = true, current_match);
    	}

    	async function get_match_data() {
    		if (current_match_loading) return;
    		current_match_loading = true;
    		await get_current_match();
    		await get_current_match_info();
    		console.log(current_match);
    		current_match_loading = false;
    	}

    	function start_periodic_check() {
    		if (settings.periodic_check.timer) {
    			return;
    		}

    		// Refresh data on interval.
    		$$invalidate(
    			0,
    			settings.periodic_check.timer = setInterval(
    				() => {
    					get_match_data();
    				},
    				settings.periodic_check.interval
    			),
    			settings
    		);
    	}

    	window.stop_periodic_check = () => {
    		clearInterval(settings.periodic_check.timer);
    		$$invalidate(0, settings.periodic_check.timer = 0, settings);
    	};

    	onMount(async () => {
    		get_url_info();
    		await get_strings();
    		current_match_loading = false;
    		await get_match_data();
    		start_periodic_check();
    	});

    	const writable_props = [];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<AOEIV> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		onMount,
    		matches_url,
    		rating_url,
    		settings,
    		current_match,
    		current_match_loading,
    		get_url_info,
    		get_strings,
    		get_current_match,
    		get_current_match_info,
    		get_match_data,
    		start_periodic_check
    	});

    	$$self.$inject_state = $$props => {
    		if ('settings' in $$props) $$invalidate(0, settings = $$props.settings);
    		if ('current_match' in $$props) $$invalidate(1, current_match = $$props.current_match);
    		if ('current_match_loading' in $$props) current_match_loading = $$props.current_match_loading;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [settings, current_match];
    }

    class AOEIV extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "AOEIV",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    const t = true;
    const richTypes = { Date: t, RegExp: t, String: t, Number: t };
    function diff(
    	obj,
    	newObj,
    	options = { cyclesFix: true },
    	_stack = []
    ) {
    	let diffs = [];
    	const isObjArray = Array.isArray(obj);
    	for (const key in obj) {
    		const objKey = obj[key];
    		const path = isObjArray ? +key : key;
    		if (!(key in newObj)) {
    			diffs.push({
    				type: "REMOVE",
    				path: [path],
    				oldValue: obj[key],
    			});
    			continue;
    		}
    		const newObjKey = newObj[key];
    		const areObjects =
    			typeof objKey === "object" && typeof newObjKey === "object";
    		if (
    			objKey &&
    			newObjKey &&
    			areObjects &&
    			!richTypes[Object.getPrototypeOf(objKey).constructor.name] &&
    			(options.cyclesFix ? !_stack.includes(objKey) : true)
    		) {
    			const nestedDiffs = diff(
    				objKey,
    				newObjKey,
    				options,
    				options.cyclesFix ? _stack.concat([objKey]) : []
    			);
    			diffs.push.apply(
    				diffs,
    				nestedDiffs.map((difference) => {
    					difference.path.unshift(path);
    					return difference;
    				})
    			);
    		} else if (
    			objKey !== newObjKey &&
    			!(
    				areObjects &&
    				(isNaN(objKey)
    					? objKey + "" === newObjKey + ""
    					: +objKey === +newObjKey)
    			)
    		) {
    			diffs.push({
    				path: [path],
    				type: "CHANGE",
    				value: newObjKey,
    				oldValue: objKey,
    			});
    		}
    	}
    	const isNewObjArray = Array.isArray(newObj);
    	for (const key in newObj) {
    		if (!(key in obj)) {
    			diffs.push({
    				type: "CREATE",
    				path: [isNewObjArray ? +key : key],
    				value: newObj[key],
    			});
    		}
    	}
    	return diffs;
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    /*export const filters = writable({
        all: false,
        pickable_all: true,
        value: "",
    });

    export const spells = writable([]);*/
    const current_match = writable({});



    // from: https://chasingcode.dev/blog/svelte-persist-state-to-localstorage/
    /*const stored_theme = localStorage.getItem("theme") ?? "light";
    export const theme = writable(stored_theme);
    theme.subscribe(value => {
        localStorage.setItem("theme", value);
    });*/

    /* src\AOE4WORLD.svelte generated by Svelte v3.46.2 */
    const file = "src\\AOE4WORLD.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[8] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[11] = list[i];
    	return child_ctx;
    }

    // (1:0) <script>      import diff from "microdiff";      import {onMount}
    function create_catch_block(ctx) {
    	const block = { c: noop, m: noop, p: noop, d: noop };

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_catch_block.name,
    		type: "catch",
    		source: "(1:0) <script>      import diff from \\\"microdiff\\\";      import {onMount}",
    		ctx
    	});

    	return block;
    }

    // (91:54)             <div class="match-info">              Map: {awaited_current_match.map}
    function create_then_block(ctx) {
    	let div;
    	let t0;
    	let t1_value = /*awaited_current_match*/ ctx[7].map + "";
    	let t1;
    	let t2;
    	let t3_value = /*awaited_current_match*/ ctx[7].server + "";
    	let t3;
    	let t4;
    	let if_block_anchor;
    	let if_block = /*awaited_current_match*/ ctx[7].teams && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text("Map: ");
    			t1 = text(t1_value);
    			t2 = text(" | Server: ");
    			t3 = text(t3_value);
    			t4 = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			attr_dev(div, "class", "match-info svelte-1rjcxs5");
    			add_location(div, file, 92, 8, 2718);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);
    			append_dev(div, t2);
    			append_dev(div, t3);
    			insert_dev(target, t4, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$current_match*/ 1 && t1_value !== (t1_value = /*awaited_current_match*/ ctx[7].map + "")) set_data_dev(t1, t1_value);
    			if (dirty & /*$current_match*/ 1 && t3_value !== (t3_value = /*awaited_current_match*/ ctx[7].server + "")) set_data_dev(t3, t3_value);

    			if (/*awaited_current_match*/ ctx[7].teams) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching) detach_dev(t4);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_then_block.name,
    		type: "then",
    		source: "(91:54)             <div class=\\\"match-info\\\">              Map: {awaited_current_match.map}",
    		ctx
    	});

    	return block;
    }

    // (97:8) {#if awaited_current_match.teams}
    function create_if_block$1(ctx) {
    	let div;
    	let each_value = /*awaited_current_match*/ ctx[7].teams;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", "teams");
    			add_location(div, file, 97, 12, 2904);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$current_match, convert_to_roman*/ 1) {
    				each_value = /*awaited_current_match*/ ctx[7].teams;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(97:8) {#if awaited_current_match.teams}",
    		ctx
    	});

    	return block;
    }

    // (108:32) {#if player.modes[awaited_current_match.kind].rank_level}
    function create_if_block_1(ctx) {
    	let img;
    	let img_src_value;
    	let img_alt_value;
    	let t0;
    	let t1_value = convert_to_roman(/*player*/ ctx[11].modes[/*awaited_current_match*/ ctx[7].kind].rank_level) + "";
    	let t1;

    	const block = {
    		c: function create() {
    			img = element("img");
    			t0 = space();
    			t1 = text(t1_value);
    			if (!src_url_equal(img.src, img_src_value = `/images/ranks/${/*player*/ ctx[11].modes[/*awaited_current_match*/ ctx[7].kind].rank_level}.png`)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "class", "rank-icon svelte-1rjcxs5");
    			attr_dev(img, "width", "27");
    			attr_dev(img, "height", "31");
    			attr_dev(img, "alt", img_alt_value = /*player*/ ctx[11].modes[/*awaited_current_match*/ ctx[7].kind].rank_level);
    			add_location(img, file, 108, 36, 3586);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$current_match*/ 1 && !src_url_equal(img.src, img_src_value = `/images/ranks/${/*player*/ ctx[11].modes[/*awaited_current_match*/ ctx[7].kind].rank_level}.png`)) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty & /*$current_match*/ 1 && img_alt_value !== (img_alt_value = /*player*/ ctx[11].modes[/*awaited_current_match*/ ctx[7].kind].rank_level)) {
    				attr_dev(img, "alt", img_alt_value);
    			}

    			if (dirty & /*$current_match*/ 1 && t1_value !== (t1_value = convert_to_roman(/*player*/ ctx[11].modes[/*awaited_current_match*/ ctx[7].kind].rank_level) + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(img);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(108:32) {#if player.modes[awaited_current_match.kind].rank_level}",
    		ctx
    	});

    	return block;
    }

    // (101:24) {#each team as player}
    function create_each_block_1(ctx) {
    	let div;
    	let img;
    	let img_src_value;
    	let img_alt_value;
    	let t0;
    	let t1_value = /*player*/ ctx[11].name + "";
    	let t1;
    	let t2;
    	let t3_value = /*player*/ ctx[11].modes[/*awaited_current_match*/ ctx[7].kind].rating + "";
    	let t3;
    	let t4;
    	let t5;
    	let t6_value = /*player*/ ctx[11].modes[/*awaited_current_match*/ ctx[7].kind].win_rate + "";
    	let t6;
    	let t7;
    	let span0;
    	let t8_value = /*player*/ ctx[11].modes[/*awaited_current_match*/ ctx[7].kind].wins_count + "";
    	let t8;
    	let t9;
    	let t10;
    	let span1;
    	let t11_value = /*player*/ ctx[11].modes[/*awaited_current_match*/ ctx[7].kind].losses_count + "";
    	let t11;
    	let t12;
    	let if_block = /*player*/ ctx[11].modes[/*awaited_current_match*/ ctx[7].kind].rank_level && create_if_block_1(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			img = element("img");
    			t0 = space();
    			t1 = text(t1_value);
    			t2 = text("\r\n                                |\r\n\r\n                                ");
    			t3 = text(t3_value);
    			t4 = text(" rating \r\n                                ");
    			if (if_block) if_block.c();
    			t5 = text("\r\n\r\n                                |\r\n                                ");
    			t6 = text(t6_value);
    			t7 = text("% winrate\r\n                                |\r\n\r\n                                ");
    			span0 = element("span");
    			t8 = text(t8_value);
    			t9 = text("W");
    			t10 = text("\r\n                                 \r\n                                ");
    			span1 = element("span");
    			t11 = text(t11_value);
    			t12 = text("L");
    			if (!src_url_equal(img.src, img_src_value = `/images/flags/small/${/*player*/ ctx[11].civilization}.jpg`)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "class", "civ-flag svelte-1rjcxs5");
    			attr_dev(img, "width", "55");
    			attr_dev(img, "height", "31");
    			attr_dev(img, "alt", img_alt_value = /*player*/ ctx[11].civilization);
    			add_location(img, file, 102, 32, 3156);
    			attr_dev(span0, "class", "win svelte-1rjcxs5");
    			add_location(span0, file, 116, 32, 4121);
    			attr_dev(span1, "class", "loss svelte-1rjcxs5");
    			add_location(span1, file, 118, 32, 4274);
    			attr_dev(div, "class", "player svelte-1rjcxs5");
    			add_location(div, file, 101, 28, 3102);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, img);
    			append_dev(div, t0);
    			append_dev(div, t1);
    			append_dev(div, t2);
    			append_dev(div, t3);
    			append_dev(div, t4);
    			if (if_block) if_block.m(div, null);
    			append_dev(div, t5);
    			append_dev(div, t6);
    			append_dev(div, t7);
    			append_dev(div, span0);
    			append_dev(span0, t8);
    			append_dev(span0, t9);
    			append_dev(div, t10);
    			append_dev(div, span1);
    			append_dev(span1, t11);
    			append_dev(span1, t12);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$current_match*/ 1 && !src_url_equal(img.src, img_src_value = `/images/flags/small/${/*player*/ ctx[11].civilization}.jpg`)) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty & /*$current_match*/ 1 && img_alt_value !== (img_alt_value = /*player*/ ctx[11].civilization)) {
    				attr_dev(img, "alt", img_alt_value);
    			}

    			if (dirty & /*$current_match*/ 1 && t1_value !== (t1_value = /*player*/ ctx[11].name + "")) set_data_dev(t1, t1_value);
    			if (dirty & /*$current_match*/ 1 && t3_value !== (t3_value = /*player*/ ctx[11].modes[/*awaited_current_match*/ ctx[7].kind].rating + "")) set_data_dev(t3, t3_value);

    			if (/*player*/ ctx[11].modes[/*awaited_current_match*/ ctx[7].kind].rank_level) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1(ctx);
    					if_block.c();
    					if_block.m(div, t5);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*$current_match*/ 1 && t6_value !== (t6_value = /*player*/ ctx[11].modes[/*awaited_current_match*/ ctx[7].kind].win_rate + "")) set_data_dev(t6, t6_value);
    			if (dirty & /*$current_match*/ 1 && t8_value !== (t8_value = /*player*/ ctx[11].modes[/*awaited_current_match*/ ctx[7].kind].wins_count + "")) set_data_dev(t8, t8_value);
    			if (dirty & /*$current_match*/ 1 && t11_value !== (t11_value = /*player*/ ctx[11].modes[/*awaited_current_match*/ ctx[7].kind].losses_count + "")) set_data_dev(t11, t11_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(101:24) {#each team as player}",
    		ctx
    	});

    	return block;
    }

    // (99:16) {#each awaited_current_match.teams as team}
    function create_each_block(ctx) {
    	let div;
    	let t;
    	let each_value_1 = /*team*/ ctx[8];
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t = space();
    			attr_dev(div, "class", "team svelte-1rjcxs5");
    			add_location(div, file, 99, 20, 3006);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$current_match, convert_to_roman*/ 1) {
    				each_value_1 = /*team*/ ctx[8];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, t);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(99:16) {#each awaited_current_match.teams as team}",
    		ctx
    	});

    	return block;
    }

    // (1:0) <script>      import diff from "microdiff";      import {onMount}
    function create_pending_block(ctx) {
    	const block = { c: noop, m: noop, p: noop, d: noop };

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_pending_block.name,
    		type: "pending",
    		source: "(1:0) <script>      import diff from \\\"microdiff\\\";      import {onMount}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let main;
    	let promise;

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		hasCatch: false,
    		pending: create_pending_block,
    		then: create_then_block,
    		catch: create_catch_block,
    		value: 7
    	};

    	handle_promise(promise = /*$current_match*/ ctx[0], info);

    	const block = {
    		c: function create() {
    			main = element("main");
    			info.block.c();
    			attr_dev(main, "class", "overlay svelte-1rjcxs5");
    			add_location(main, file, 89, 0, 2628);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			info.block.m(main, info.anchor = null);
    			info.mount = () => main;
    			info.anchor = null;
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;
    			info.ctx = ctx;

    			if (dirty & /*$current_match*/ 1 && promise !== (promise = /*$current_match*/ ctx[0]) && handle_promise(promise, info)) ; else {
    				update_await_block_branch(info, ctx, dirty);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			info.block.d();
    			info.token = null;
    			info = null;
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
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

    function instance$1($$self, $$props, $$invalidate) {
    	let $current_match;
    	validate_store(current_match, 'current_match');
    	component_subscribe($$self, current_match, $$value => $$invalidate(0, $current_match = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('AOE4WORLD', slots, []);
    	const match_url = profile_id => `https://aoe4world.com/api/v0/players/${profile_id}/games/last`;

    	let settings = {
    		steam_id: "",
    		civs: [],
    		map_types: [],
    		periodic_check: { timer: 0, interval: 20 * 1000 }
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
    			set_store_value(current_match, $current_match = awaited_current_match, $current_match);
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
    		settings.periodic_check.timer = setInterval(
    			() => {
    				set_current_match();
    			},
    			settings.periodic_check.interval
    		);
    	}

    	window.stop_periodic_check = () => {
    		clearInterval(settings.periodic_check.timer);
    		settings.periodic_check.timer = 0;
    	};

    	onMount(async () => {
    		get_url_info();
    		set_current_match();
    		start_periodic_check();
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<AOE4WORLD> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		diff,
    		onMount,
    		current_match,
    		match_url,
    		settings,
    		get_url_info,
    		set_current_match,
    		get_current_match,
    		start_periodic_check,
    		convert_to_roman,
    		get_roman_number,
    		$current_match
    	});

    	$$self.$inject_state = $$props => {
    		if ('settings' in $$props) settings = $$props.settings;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [$current_match];
    }

    class AOE4WORLD extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "AOE4WORLD",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.46.2 */

    // (55:0) {:else}
    function create_else_block(ctx) {
    	let aoe4world;
    	let current;
    	aoe4world = new AOE4WORLD({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(aoe4world.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(aoe4world, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(aoe4world.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(aoe4world.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(aoe4world, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(55:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (53:0) {#if component_to_render === "AOEIV"}
    function create_if_block(ctx) {
    	let aoeiv;
    	let current;
    	aoeiv = new AOEIV({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(aoeiv.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(aoeiv, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(aoeiv.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(aoeiv.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(aoeiv, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(53:0) {#if component_to_render === \\\"AOEIV\\\"}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		return 1;
    	}

    	current_block_type_index = select_block_type();
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const component_to_render = "AOE4WORLD";

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ AOEIV, AOE4WORLD, component_to_render });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
