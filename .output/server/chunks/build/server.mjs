import process from 'node:process';globalThis._importMeta_=globalThis._importMeta_||{url:"file:///_entry.js",env:process.env};import { hasInjectionContext, getCurrentInstance, createApp, provide, toRef, onErrorCaptured, onServerPrefetch, unref, createVNode, resolveDynamicComponent, shallowReactive, reactive, effectScope, computed, defineComponent, h, isReadonly, isRef, isShallow, isReactive, toRaw, inject, defineAsyncComponent, mergeProps, getCurrentScope, ref, watch, useSSRContext } from 'vue';
import { k as hasProtocol, l as isScriptProtocol, m as joinURL, w as withQuery, n as sanitizeStatusCode, o as getContext, $ as $fetch, p as createHooks, h as createError$1, q as isEqual, r as stringifyParsedURL, v as stringifyQuery, x as parseQuery, y as toRouteMatcher, z as createRouter, A as defu } from '../_/nitro.mjs';
import { b as baseURL } from '../routes/renderer.mjs';
import { ssrRenderSuspense, ssrRenderComponent, ssrRenderVNode, ssrRenderAttrs, ssrRenderAttr, ssrRenderList, ssrRenderClass, ssrInterpolate, ssrIncludeBooleanAttr, ssrLooseContain, ssrRenderStyle } from 'vue/server-renderer';
import { createSeriesMarkers } from 'lightweight-charts';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'node:url';
import 'vue-bundle-renderer/runtime';
import 'unhead/server';
import 'devalue';
import 'unhead/utils';

if (!globalThis.$fetch) {
  globalThis.$fetch = $fetch.create({
    baseURL: baseURL()
  });
}
if (!("global" in globalThis)) {
  globalThis.global = globalThis;
}
const nuxtLinkDefaults = { "componentName": "NuxtLink" };
const appId = "nuxt-app";
function getNuxtAppCtx(id = appId) {
  return getContext(id, {
    asyncContext: false
  });
}
const NuxtPluginIndicator = "__nuxt_plugin";
function createNuxtApp(options) {
  let hydratingCount = 0;
  const nuxtApp = {
    _id: options.id || appId || "nuxt-app",
    _scope: effectScope(),
    provide: void 0,
    versions: {
      get nuxt() {
        return "4.2.2";
      },
      get vue() {
        return nuxtApp.vueApp.version;
      }
    },
    payload: shallowReactive({
      ...options.ssrContext?.payload || {},
      data: shallowReactive({}),
      state: reactive({}),
      once: /* @__PURE__ */ new Set(),
      _errors: shallowReactive({})
    }),
    static: {
      data: {}
    },
    runWithContext(fn) {
      if (nuxtApp._scope.active && !getCurrentScope()) {
        return nuxtApp._scope.run(() => callWithNuxt(nuxtApp, fn));
      }
      return callWithNuxt(nuxtApp, fn);
    },
    isHydrating: false,
    deferHydration() {
      if (!nuxtApp.isHydrating) {
        return () => {
        };
      }
      hydratingCount++;
      let called = false;
      return () => {
        if (called) {
          return;
        }
        called = true;
        hydratingCount--;
        if (hydratingCount === 0) {
          nuxtApp.isHydrating = false;
          return nuxtApp.callHook("app:suspense:resolve");
        }
      };
    },
    _asyncDataPromises: {},
    _asyncData: shallowReactive({}),
    _payloadRevivers: {},
    ...options
  };
  {
    nuxtApp.payload.serverRendered = true;
  }
  if (nuxtApp.ssrContext) {
    nuxtApp.payload.path = nuxtApp.ssrContext.url;
    nuxtApp.ssrContext.nuxt = nuxtApp;
    nuxtApp.ssrContext.payload = nuxtApp.payload;
    nuxtApp.ssrContext.config = {
      public: nuxtApp.ssrContext.runtimeConfig.public,
      app: nuxtApp.ssrContext.runtimeConfig.app
    };
  }
  nuxtApp.hooks = createHooks();
  nuxtApp.hook = nuxtApp.hooks.hook;
  {
    const contextCaller = async function(hooks, args) {
      for (const hook of hooks) {
        await nuxtApp.runWithContext(() => hook(...args));
      }
    };
    nuxtApp.hooks.callHook = (name, ...args) => nuxtApp.hooks.callHookWith(contextCaller, name, ...args);
  }
  nuxtApp.callHook = nuxtApp.hooks.callHook;
  nuxtApp.provide = (name, value) => {
    const $name = "$" + name;
    defineGetter(nuxtApp, $name, value);
    defineGetter(nuxtApp.vueApp.config.globalProperties, $name, value);
  };
  defineGetter(nuxtApp.vueApp, "$nuxt", nuxtApp);
  defineGetter(nuxtApp.vueApp.config.globalProperties, "$nuxt", nuxtApp);
  const runtimeConfig = options.ssrContext.runtimeConfig;
  nuxtApp.provide("config", runtimeConfig);
  return nuxtApp;
}
function registerPluginHooks(nuxtApp, plugin) {
  if (plugin.hooks) {
    nuxtApp.hooks.addHooks(plugin.hooks);
  }
}
async function applyPlugin(nuxtApp, plugin) {
  if (typeof plugin === "function") {
    const { provide: provide2 } = await nuxtApp.runWithContext(() => plugin(nuxtApp)) || {};
    if (provide2 && typeof provide2 === "object") {
      for (const key in provide2) {
        nuxtApp.provide(key, provide2[key]);
      }
    }
  }
}
async function applyPlugins(nuxtApp, plugins2) {
  const resolvedPlugins = /* @__PURE__ */ new Set();
  const unresolvedPlugins = [];
  const parallels = [];
  let error = void 0;
  let promiseDepth = 0;
  async function executePlugin(plugin) {
    const unresolvedPluginsForThisPlugin = plugin.dependsOn?.filter((name) => plugins2.some((p) => p._name === name) && !resolvedPlugins.has(name)) ?? [];
    if (unresolvedPluginsForThisPlugin.length > 0) {
      unresolvedPlugins.push([new Set(unresolvedPluginsForThisPlugin), plugin]);
    } else {
      const promise = applyPlugin(nuxtApp, plugin).then(async () => {
        if (plugin._name) {
          resolvedPlugins.add(plugin._name);
          await Promise.all(unresolvedPlugins.map(async ([dependsOn, unexecutedPlugin]) => {
            if (dependsOn.has(plugin._name)) {
              dependsOn.delete(plugin._name);
              if (dependsOn.size === 0) {
                promiseDepth++;
                await executePlugin(unexecutedPlugin);
              }
            }
          }));
        }
      }).catch((e) => {
        if (!plugin.parallel && !nuxtApp.payload.error) {
          throw e;
        }
        error ||= e;
      });
      if (plugin.parallel) {
        parallels.push(promise);
      } else {
        await promise;
      }
    }
  }
  for (const plugin of plugins2) {
    if (nuxtApp.ssrContext?.islandContext && plugin.env?.islands === false) {
      continue;
    }
    registerPluginHooks(nuxtApp, plugin);
  }
  for (const plugin of plugins2) {
    if (nuxtApp.ssrContext?.islandContext && plugin.env?.islands === false) {
      continue;
    }
    await executePlugin(plugin);
  }
  await Promise.all(parallels);
  if (promiseDepth) {
    for (let i = 0; i < promiseDepth; i++) {
      await Promise.all(parallels);
    }
  }
  if (error) {
    throw nuxtApp.payload.error || error;
  }
}
// @__NO_SIDE_EFFECTS__
function defineNuxtPlugin(plugin) {
  if (typeof plugin === "function") {
    return plugin;
  }
  const _name = plugin._name || plugin.name;
  delete plugin.name;
  return Object.assign(plugin.setup || (() => {
  }), plugin, { [NuxtPluginIndicator]: true, _name });
}
function callWithNuxt(nuxt, setup, args) {
  const fn = () => setup();
  const nuxtAppCtx = getNuxtAppCtx(nuxt._id);
  {
    return nuxt.vueApp.runWithContext(() => nuxtAppCtx.callAsync(nuxt, fn));
  }
}
function tryUseNuxtApp(id) {
  let nuxtAppInstance;
  if (hasInjectionContext()) {
    nuxtAppInstance = getCurrentInstance()?.appContext.app.$nuxt;
  }
  nuxtAppInstance ||= getNuxtAppCtx(id).tryUse();
  return nuxtAppInstance || null;
}
function useNuxtApp(id) {
  const nuxtAppInstance = tryUseNuxtApp(id);
  if (!nuxtAppInstance) {
    {
      throw new Error("[nuxt] instance unavailable");
    }
  }
  return nuxtAppInstance;
}
// @__NO_SIDE_EFFECTS__
function useRuntimeConfig(_event) {
  return useNuxtApp().$config;
}
function defineGetter(obj, key, val) {
  Object.defineProperty(obj, key, { get: () => val });
}
const PageRouteSymbol = /* @__PURE__ */ Symbol("route");
globalThis._importMeta_.url.replace(/\/app\/.*$/, "/");
const useRouter = () => {
  return useNuxtApp()?.$router;
};
const useRoute = () => {
  if (hasInjectionContext()) {
    return inject(PageRouteSymbol, useNuxtApp()._route);
  }
  return useNuxtApp()._route;
};
// @__NO_SIDE_EFFECTS__
function defineNuxtRouteMiddleware(middleware) {
  return middleware;
}
const isProcessingMiddleware = () => {
  try {
    if (useNuxtApp()._processingMiddleware) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
};
const URL_QUOTE_RE = /"/g;
const navigateTo = (to, options) => {
  to ||= "/";
  const toPath = typeof to === "string" ? to : "path" in to ? resolveRouteObject(to) : useRouter().resolve(to).href;
  const isExternalHost = hasProtocol(toPath, { acceptRelative: true });
  const isExternal = options?.external || isExternalHost;
  if (isExternal) {
    if (!options?.external) {
      throw new Error("Navigating to an external URL is not allowed by default. Use `navigateTo(url, { external: true })`.");
    }
    const { protocol } = new URL(toPath, "http://localhost");
    if (protocol && isScriptProtocol(protocol)) {
      throw new Error(`Cannot navigate to a URL with '${protocol}' protocol.`);
    }
  }
  const inMiddleware = isProcessingMiddleware();
  const router = useRouter();
  const nuxtApp = useNuxtApp();
  {
    if (nuxtApp.ssrContext) {
      const fullPath = typeof to === "string" || isExternal ? toPath : router.resolve(to).fullPath || "/";
      const location2 = isExternal ? toPath : joinURL((/* @__PURE__ */ useRuntimeConfig()).app.baseURL, fullPath);
      const redirect = async function(response) {
        await nuxtApp.callHook("app:redirected");
        const encodedLoc = location2.replace(URL_QUOTE_RE, "%22");
        const encodedHeader = encodeURL(location2, isExternalHost);
        nuxtApp.ssrContext._renderResponse = {
          statusCode: sanitizeStatusCode(options?.redirectCode || 302, 302),
          body: `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=${encodedLoc}"></head></html>`,
          headers: { location: encodedHeader }
        };
        return response;
      };
      if (!isExternal && inMiddleware) {
        router.afterEach((final) => final.fullPath === fullPath ? redirect(false) : void 0);
        return to;
      }
      return redirect(!inMiddleware ? void 0 : (
        /* abort route navigation */
        false
      ));
    }
  }
  if (isExternal) {
    nuxtApp._scope.stop();
    if (options?.replace) {
      (void 0).replace(toPath);
    } else {
      (void 0).href = toPath;
    }
    if (inMiddleware) {
      if (!nuxtApp.isHydrating) {
        return false;
      }
      return new Promise(() => {
      });
    }
    return Promise.resolve();
  }
  return options?.replace ? router.replace(to) : router.push(to);
};
function resolveRouteObject(to) {
  return withQuery(to.path || "", to.query || {}) + (to.hash || "");
}
function encodeURL(location2, isExternalHost = false) {
  const url = new URL(location2, "http://localhost");
  if (!isExternalHost) {
    return url.pathname + url.search + url.hash;
  }
  if (location2.startsWith("//")) {
    return url.toString().replace(url.protocol, "");
  }
  return url.toString();
}
const NUXT_ERROR_SIGNATURE = "__nuxt_error";
const useError = /* @__NO_SIDE_EFFECTS__ */ () => toRef(useNuxtApp().payload, "error");
const showError = (error) => {
  const nuxtError = createError(error);
  try {
    const error2 = /* @__PURE__ */ useError();
    if (false) ;
    error2.value ||= nuxtError;
  } catch {
    throw nuxtError;
  }
  return nuxtError;
};
const isNuxtError = (error) => !!error && typeof error === "object" && NUXT_ERROR_SIGNATURE in error;
const createError = (error) => {
  const nuxtError = createError$1(error);
  Object.defineProperty(nuxtError, NUXT_ERROR_SIGNATURE, {
    value: true,
    configurable: false,
    writable: false
  });
  return nuxtError;
};
const unhead_k2P3m_ZDyjlr2mMYnoDPwavjsDN8hBlk9cFai0bbopU = /* @__PURE__ */ defineNuxtPlugin({
  name: "nuxt:head",
  enforce: "pre",
  setup(nuxtApp) {
    const head = nuxtApp.ssrContext.head;
    nuxtApp.vueApp.use(head);
  }
});
async function getRouteRules(arg) {
  const path = typeof arg === "string" ? arg : arg.path;
  {
    useNuxtApp().ssrContext._preloadManifest = true;
    const _routeRulesMatcher = toRouteMatcher(
      createRouter({ routes: (/* @__PURE__ */ useRuntimeConfig()).nitro.routeRules })
    );
    return defu({}, ..._routeRulesMatcher.matchAll(path).reverse());
  }
}
const manifest_45route_45rule = /* @__PURE__ */ defineNuxtRouteMiddleware(async (to) => {
  {
    return;
  }
});
const globalMiddleware = [
  manifest_45route_45rule
];
function getRouteFromPath(fullPath) {
  const route = fullPath && typeof fullPath === "object" ? fullPath : {};
  if (typeof fullPath === "object") {
    fullPath = stringifyParsedURL({
      pathname: fullPath.path || "",
      search: stringifyQuery(fullPath.query || {}),
      hash: fullPath.hash || ""
    });
  }
  const url = new URL(fullPath.toString(), "http://localhost");
  return {
    path: url.pathname,
    fullPath,
    query: parseQuery(url.search),
    hash: url.hash,
    // stub properties for compat with vue-router
    params: route.params || {},
    name: void 0,
    matched: route.matched || [],
    redirectedFrom: void 0,
    meta: route.meta || {},
    href: fullPath
  };
}
const router_DclsWNDeVV7SyG4lslgLnjbQUK1ws8wgf2FHaAbo7Cw = /* @__PURE__ */ defineNuxtPlugin({
  name: "nuxt:router",
  enforce: "pre",
  setup(nuxtApp) {
    const initialURL = nuxtApp.ssrContext.url;
    const routes = [];
    const hooks = {
      "navigate:before": [],
      "resolve:before": [],
      "navigate:after": [],
      "error": []
    };
    const registerHook = (hook, guard) => {
      hooks[hook].push(guard);
      return () => hooks[hook].splice(hooks[hook].indexOf(guard), 1);
    };
    (/* @__PURE__ */ useRuntimeConfig()).app.baseURL;
    const route = reactive(getRouteFromPath(initialURL));
    async function handleNavigation(url, replace) {
      try {
        const to = getRouteFromPath(url);
        for (const middleware of hooks["navigate:before"]) {
          const result = await middleware(to, route);
          if (result === false || result instanceof Error) {
            return;
          }
          if (typeof result === "string" && result.length) {
            return handleNavigation(result, true);
          }
        }
        for (const handler of hooks["resolve:before"]) {
          await handler(to, route);
        }
        Object.assign(route, to);
        if (false) ;
        for (const middleware of hooks["navigate:after"]) {
          await middleware(to, route);
        }
      } catch (err) {
        for (const handler of hooks.error) {
          await handler(err);
        }
      }
    }
    const currentRoute = computed(() => route);
    const router = {
      currentRoute,
      isReady: () => Promise.resolve(),
      // These options provide a similar API to vue-router but have no effect
      options: {},
      install: () => Promise.resolve(),
      // Navigation
      push: (url) => handleNavigation(url),
      replace: (url) => handleNavigation(url),
      back: () => (void 0).history.go(-1),
      go: (delta) => (void 0).history.go(delta),
      forward: () => (void 0).history.go(1),
      // Guards
      beforeResolve: (guard) => registerHook("resolve:before", guard),
      beforeEach: (guard) => registerHook("navigate:before", guard),
      afterEach: (guard) => registerHook("navigate:after", guard),
      onError: (handler) => registerHook("error", handler),
      // Routes
      resolve: getRouteFromPath,
      addRoute: (parentName, route2) => {
        routes.push(route2);
      },
      getRoutes: () => routes,
      hasRoute: (name) => routes.some((route2) => route2.name === name),
      removeRoute: (name) => {
        const index = routes.findIndex((route2) => route2.name === name);
        if (index !== -1) {
          routes.splice(index, 1);
        }
      }
    };
    nuxtApp.vueApp.component("RouterLink", defineComponent({
      functional: true,
      props: {
        to: {
          type: String,
          required: true
        },
        custom: Boolean,
        replace: Boolean,
        // Not implemented
        activeClass: String,
        exactActiveClass: String,
        ariaCurrentValue: String
      },
      setup: (props, { slots }) => {
        const navigate = () => handleNavigation(props.to, props.replace);
        return () => {
          const route2 = router.resolve(props.to);
          return props.custom ? slots.default?.({ href: props.to, navigate, route: route2 }) : h("a", { href: props.to, onClick: (e) => {
            e.preventDefault();
            return navigate();
          } }, slots);
        };
      }
    }));
    nuxtApp._route = route;
    nuxtApp._middleware ||= {
      global: [],
      named: {}
    };
    const initialLayout = nuxtApp.payload.state._layout;
    nuxtApp.hooks.hookOnce("app:created", async () => {
      router.beforeEach(async (to, from) => {
        to.meta = reactive(to.meta || {});
        if (nuxtApp.isHydrating && initialLayout && !isReadonly(to.meta.layout)) {
          to.meta.layout = initialLayout;
        }
        nuxtApp._processingMiddleware = true;
        if (!nuxtApp.ssrContext?.islandContext) {
          const middlewareEntries = /* @__PURE__ */ new Set([...globalMiddleware, ...nuxtApp._middleware.global]);
          {
            const routeRules = await nuxtApp.runWithContext(() => getRouteRules({ path: to.path }));
            if (routeRules.appMiddleware) {
              for (const key in routeRules.appMiddleware) {
                const guard = nuxtApp._middleware.named[key];
                if (!guard) {
                  return;
                }
                if (routeRules.appMiddleware[key]) {
                  middlewareEntries.add(guard);
                } else {
                  middlewareEntries.delete(guard);
                }
              }
            }
          }
          for (const middleware of middlewareEntries) {
            const result = await nuxtApp.runWithContext(() => middleware(to, from));
            {
              if (result === false || result instanceof Error) {
                const error = result || createError$1({
                  statusCode: 404,
                  statusMessage: `Page Not Found: ${initialURL}`,
                  data: {
                    path: initialURL
                  }
                });
                delete nuxtApp._processingMiddleware;
                return nuxtApp.runWithContext(() => showError(error));
              }
            }
            if (result === true) {
              continue;
            }
            if (result || result === false) {
              return result;
            }
          }
        }
      });
      router.afterEach(() => {
        delete nuxtApp._processingMiddleware;
      });
      await router.replace(initialURL);
      if (!isEqual(route.fullPath, initialURL)) {
        await nuxtApp.runWithContext(() => navigateTo(route.fullPath));
      }
    });
    return {
      provide: {
        route,
        router
      }
    };
  }
});
function definePayloadReducer(name, reduce) {
  {
    useNuxtApp().ssrContext._payloadReducers[name] = reduce;
  }
}
const reducers = [
  ["NuxtError", (data) => isNuxtError(data) && data.toJSON()],
  ["EmptyShallowRef", (data) => isRef(data) && isShallow(data) && !data.value && (typeof data.value === "bigint" ? "0n" : JSON.stringify(data.value) || "_")],
  ["EmptyRef", (data) => isRef(data) && !data.value && (typeof data.value === "bigint" ? "0n" : JSON.stringify(data.value) || "_")],
  ["ShallowRef", (data) => isRef(data) && isShallow(data) && data.value],
  ["ShallowReactive", (data) => isReactive(data) && isShallow(data) && toRaw(data)],
  ["Ref", (data) => isRef(data) && data.value],
  ["Reactive", (data) => isReactive(data) && toRaw(data)]
];
const revive_payload_server_MVtmlZaQpj6ApFmshWfUWl5PehCebzaBf2NuRMiIbms = /* @__PURE__ */ defineNuxtPlugin({
  name: "nuxt:revive-payload:server",
  setup() {
    for (const [reducer, fn] of reducers) {
      definePayloadReducer(reducer, fn);
    }
  }
});
const components_plugin_4kY4pyzJIYX99vmMAAIorFf3CnAaptHitJgf7JxiED8 = /* @__PURE__ */ defineNuxtPlugin({
  name: "nuxt:global-components"
});
const plugins = [
  unhead_k2P3m_ZDyjlr2mMYnoDPwavjsDN8hBlk9cFai0bbopU,
  router_DclsWNDeVV7SyG4lslgLnjbQUK1ws8wgf2FHaAbo7Cw,
  revive_payload_server_MVtmlZaQpj6ApFmshWfUWl5PehCebzaBf2NuRMiIbms,
  components_plugin_4kY4pyzJIYX99vmMAAIorFf3CnAaptHitJgf7JxiED8
];
const _export_sfc = (sfc, props) => {
  const target = sfc.__vccOpts || sfc;
  for (const [key, val] of props) {
    target[key] = val;
  }
  return target;
};
const DEFAULT_VISIBLE_BARS = 120;
const _sfc_main$3 = {
  __name: "charts",
  __ssrInlineRender: true,
  setup(__props) {
    const config = /* @__PURE__ */ useRuntimeConfig();
    const API_BASE = config.public.apiBase;
    const WS_BASE = config.public.wsBase;
    const route = useRoute();
    const getQuery = (k, d) => route.query[k] || d;
    const SYMBOL = getQuery("symbol", "BTC_USDT");
    const INTERVAL = getQuery("interval", "1d");
    const HISTORY_LIMIT = getQuery("limit", "2000");
    ref(null);
    const contracts = ref([]);
    const timeframes = ["1m", "5m", "30m", "1d"];
    const selectedTfIndex = ref(
      Math.max(0, timeframes.indexOf(INTERVAL))
    );
    const selectedInterval = computed(() => timeframes[selectedTfIndex.value]);
    const activeSymbol = ref(SYMBOL);
    const inputSymbol = ref(SYMBOL);
    ref(SYMBOL);
    const showOrigin = ref(true);
    const showMini = ref(false);
    const hoverPct = ref("");
    const isFullscreen = ref(false);
    const backtestEnabled = ref(false);
    const maxCandles = ref(1e3);
    const buffer = ref(0.1);
    const dtlRange = ref(0);
    const entryTimes = ref(/* @__PURE__ */ new Set());
    const exitTimes = ref(/* @__PURE__ */ new Set());
    let series = {};
    let candles = [];
    let ws;
    let newestTime = null;
    const loadingHistory = ref(false);
    let isInitialLoad = true;
    const showTradeHistories = ref(false);
    const backtestDirty = ref(false);
    const backtestResult = ref(null);
    const tradeHistories = ref([]);
    function showLatestCandlePct() {
      if (candles.length < 2) {
        hoverPct.value = "";
        return;
      }
      const latest = candles[candles.length - 1];
      const prev = candles[candles.length - 2];
      if (!latest?.close || !prev?.close) {
        hoverPct.value = "";
        return;
      }
      const priceDiff = latest.close - prev.close;
      const pct = (latest.close - prev.close) / prev.close * 100;
      const ampl = (latest.high - latest.low) / latest.low * 100;
      const dtlrange = (latest.up - latest.down) / latest.down * 100;
      hoverPct.value = `${priceDiff >= 0 ? "+" : ""}${priceDiff.toFixed(1)} (${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%) | Ampl: ${ampl.toFixed(2)}% | DTL Range: ${dtlrange.toFixed(2)}%`;
    }
    const normalize = (list) => [...new Map(list.map((c) => [c.time, c])).values()].sort((a, b) => a.time - b.time);
    const lineData = (k) => candles.filter((c) => typeof c[k] === "number").map((c) => ({ time: c.time, value: c[k] }));
    function zoomToLastBars(n = DEFAULT_VISIBLE_BARS) {
      if (!candles.length || true) return;
    }
    async function loadHistory() {
      if (loadingHistory.value) return;
      loadingHistory.value = true;
      const url = `${API_BASE}/api/kline/history?symbol=${activeSymbol.value}&interval=${selectedInterval.value}&limit=${HISTORY_LIMIT}`;
      const data = await fetch(url).then((r) => r.json());
      if (!data?.length) return loadingHistory.value = false;
      candles = normalize(data);
      newestTime = candles[candles.length - 1].time;
      applyHistory();
      loadingHistory.value = false;
    }
    function connectWS() {
      ws?.close();
      ws = new WebSocket(
        `${WS_BASE}/ws/candle?symbol=${activeSymbol.value}&interval=${selectedInterval.value}`
      );
      ws.onmessage = (e) => {
        if (loadingHistory.value || !series.candle) return;
        const c = JSON.parse(e.data);
        if (newestTime && c.time < newestTime) return;
        const last = candles[candles.length - 1];
        last?.time === c.time ? candles.splice(-1, 1, c) : candles.push(c);
        newestTime = c.time;
        series.candle.update(c);
        showLatestCandlePct();
      };
    }
    function applyHistory() {
      if (!series.candle) return;
      let candleData = candles;
      if (backtestEnabled.value) {
        candleData = candles.map((c) => {
          let color;
          if (entryTimes.value.has(c.time)) {
            color = c.close > c.open ? "#00c853" : "#ff1744";
          } else if (exitTimes.value.has(c.time)) {
            color = c.close > c.open ? "#004d40" : "#666666";
          }
          return color ? { ...c, color } : c;
        });
      }
      series.candle.setData(candleData);
      showOrigin.value ? (series.up.setData(lineData("up")), series.down.setData(lineData("down"))) : (series.up.setData([]), series.down.setData([]));
      showMini.value ? (series.upMini.setData(lineData("upMini")), series.downMini.setData(lineData("downMini"))) : (series.upMini.setData([]), series.downMini.setData([]));
      showLatestCandlePct();
      if (isInitialLoad) {
        zoomToLastBars();
        isInitialLoad = false;
      }
    }
    async function loadBacktest() {
      if (!backtestEnabled.value || !series.candle) return;
      if (loadingHistory.value) return;
      loadingHistory.value = true;
      const url = `${API_BASE}/api/backtest/dtl?symbol=${activeSymbol.value}&interval=${selectedInterval.value}&buffer=${buffer.value}&dtlRange=${dtlRange.value}&max=${maxCandles.value}`;
      const data = await fetch(url).then((r) => r.json());
      if (!data) return;
      entryTimes.value = /* @__PURE__ */ new Set([...data.EntryLongHistory || [], ...data.EntryShortHistory || []]);
      exitTimes.value = /* @__PURE__ */ new Set([...data.ExitLongHistory || [], ...data.ExitShortHistory || []]);
      const markers = [];
      const longEntryCount = /* @__PURE__ */ new Map();
      (data.EntryLongHistory || []).forEach((time) => {
        longEntryCount.set(time, (longEntryCount.get(time) || 0) + 1);
      });
      const shortEntryCount = /* @__PURE__ */ new Map();
      (data.EntryShortHistory || []).forEach((time) => {
        shortEntryCount.set(time, (shortEntryCount.get(time) || 0) + 1);
      });
      const longExitCount = /* @__PURE__ */ new Map();
      (data.ExitLongHistory || []).forEach((time) => {
        longExitCount.set(time, (longExitCount.get(time) || 0) + 1);
      });
      const shortExitCount = /* @__PURE__ */ new Map();
      (data.ExitShortHistory || []).forEach((time) => {
        shortExitCount.set(time, (shortExitCount.get(time) || 0) + 1);
      });
      longEntryCount.forEach((count, time) => {
        markers.push({
          time,
          position: "belowBar",
          color: "#00c853",
          shape: "arrowUp",
          text: count > 1 ? `(${count})` : ""
        });
      });
      shortEntryCount.forEach((count, time) => {
        markers.push({
          time,
          position: "aboveBar",
          color: "#ff1744",
          shape: "arrowDown",
          text: count > 1 ? `(${count})` : ""
        });
      });
      longExitCount.forEach((count, time) => {
        markers.push({
          time,
          position: "aboveBar",
          color: "#ff1744",
          shape: "arrowDown",
          text: count > 1 ? `Exit Long (${count})` : "Exit Long"
        });
      });
      shortExitCount.forEach((count, time) => {
        markers.push({
          time,
          position: "belowBar",
          color: "#00c853",
          shape: "arrowUp",
          text: count > 1 ? `Exit Short (${count})` : "Exit Short"
        });
      });
      markers.sort((a, b) => a.time - b.time);
      try {
        createSeriesMarkers(series.candle, markers);
      } catch (e) {
        console.warn("createSeriesMarkers failed:", e.message);
      }
      tradeHistories.value = data.TradeHistories || [];
      applyHistory();
      backtestResult.value = {
        TotalTrades: data.TotalTrades,
        Success: data.Success,
        BurnCount: data.BurnCount,
        ProfitSum: data.ProfitSum,
        MaxDrawdown: data.MaxDrawdown
      };
      loadingHistory.value = false;
    }
    watch(inputSymbol, (v) => {
      if (contracts.value.includes(v) && v !== activeSymbol.value)
        activeSymbol.value = v;
    });
    watch([activeSymbol, selectedInterval], () => {
      history.replaceState(null, "", `?symbol=${activeSymbol.value}&interval=${selectedInterval.value}`);
      candles = [];
      isInitialLoad = true;
      loadHistory();
      connectWS();
      if (backtestEnabled.value) {
        entryTimes.value = /* @__PURE__ */ new Set();
        exitTimes.value = /* @__PURE__ */ new Set();
        try {
          createSeriesMarkers(series.candle, []);
        } catch (e) {
        }
        if (series.markers) {
          series.markers.setData([]);
        }
        loadBacktest();
      }
    });
    watch([showOrigin, showMini], applyHistory);
    watch([backtestEnabled, maxCandles], () => {
      backtestDirty.value = true;
    });
    watch([maxCandles, buffer], () => {
      backtestDirty.value = true;
    });
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({
        class: ["chart-wrapper", { fullscreen: isFullscreen.value }]
      }, _attrs))} data-v-7d44a4b9><div class="tv-toolbar" data-v-7d44a4b9><div class="tv-symbol-box" data-v-7d44a4b9><span class="tv-search-icon" data-v-7d44a4b9>🔍</span><input${ssrRenderAttr("value", inputSymbol.value)} list="symbol-list" class="tv-symbol-input" placeholder="Symbol" data-v-7d44a4b9><span class="tv-caret" data-v-7d44a4b9>▾</span></div><datalist id="symbol-list" data-v-7d44a4b9><!--[-->`);
      ssrRenderList(contracts.value, (c) => {
        _push(`<option${ssrRenderAttr("value", c)} data-v-7d44a4b9></option>`);
      });
      _push(`<!--]--></datalist><div class="tv-tf-group" data-v-7d44a4b9><!--[-->`);
      ssrRenderList(timeframes, (tf, i) => {
        _push(`<button class="${ssrRenderClass([{ active: selectedTfIndex.value === i }, "tv-tf-btn"])}" data-v-7d44a4b9>${ssrInterpolate(tf)}</button>`);
      });
      _push(`<!--]--></div><label data-v-7d44a4b9><input type="checkbox"${ssrIncludeBooleanAttr(Array.isArray(showOrigin.value) ? ssrLooseContain(showOrigin.value, null) : showOrigin.value) ? " checked" : ""} data-v-7d44a4b9> Origin</label><label data-v-7d44a4b9><input type="checkbox"${ssrIncludeBooleanAttr(Array.isArray(showMini.value) ? ssrLooseContain(showMini.value, null) : showMini.value) ? " checked" : ""} data-v-7d44a4b9> Mini</label><button class="tv-fullscreen-btn"${ssrRenderAttr("title", isFullscreen.value ? "Exit Fullscreen" : "Enter Fullscreen")} data-v-7d44a4b9>${ssrInterpolate(isFullscreen.value ? "⛶" : "⛶")}</button><label data-v-7d44a4b9><input type="checkbox"${ssrIncludeBooleanAttr(Array.isArray(backtestEnabled.value) ? ssrLooseContain(backtestEnabled.value, null) : backtestEnabled.value) ? " checked" : ""} data-v-7d44a4b9> Backtest </label>`);
      if (backtestEnabled.value) {
        _push(`<div class="tv-backtest-settings" data-v-7d44a4b9><input${ssrRenderAttr("value", maxCandles.value)} type="number" min="1" max="10000" class="tv-max-input" placeholder="Max candles" data-v-7d44a4b9><input${ssrRenderAttr("value", buffer.value)} type="number" step="0.01" min="0" class="tv-max-input" style="${ssrRenderStyle({ "width": "80px" })}" placeholder="Buffer" data-v-7d44a4b9><input${ssrRenderAttr("value", dtlRange.value)} type="number" step="0.00" min="0" class="tv-max-input" style="${ssrRenderStyle({ "width": "80px" })}" placeholder="DTL Range" data-v-7d44a4b9><button class="tv-update-btn" data-v-7d44a4b9> Update </button></div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div><div class="chart-area" data-v-7d44a4b9>`);
      if (hoverPct.value) {
        _push(`<div class="chart-pct-label" data-v-7d44a4b9><span class="${ssrRenderClass([{ down: hoverPct.value.startsWith("-") }, "dot"])}" data-v-7d44a4b9></span> ${ssrInterpolate(hoverPct.value)}</div>`);
      } else {
        _push(`<!---->`);
      }
      if (loadingHistory.value) {
        _push(`<div class="loading-overlay" data-v-7d44a4b9><div class="loading-spinner" data-v-7d44a4b9><div class="spinner" data-v-7d44a4b9></div><span data-v-7d44a4b9>Loading...</span></div></div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`<div class="chart-container" data-v-7d44a4b9></div></div>`);
      if (backtestResult.value) {
        _push(`<div class="backtest-result" data-v-7d44a4b9><div data-v-7d44a4b9>📊 Trades: <b data-v-7d44a4b9>${ssrInterpolate(backtestResult.value.TotalTrades)}</b><input type="checkbox"${ssrIncludeBooleanAttr(Array.isArray(showTradeHistories.value) ? ssrLooseContain(showTradeHistories.value, null) : showTradeHistories.value) ? " checked" : ""} data-v-7d44a4b9></div><div data-v-7d44a4b9>✅ Win: <b data-v-7d44a4b9>${ssrInterpolate(backtestResult.value.Success)}</b></div><div data-v-7d44a4b9>🔥 Loss: <b style="${ssrRenderStyle({ "color": "#ff5252" })}" data-v-7d44a4b9>${ssrInterpolate(backtestResult.value.BurnCount)}</b></div><div data-v-7d44a4b9>💰 Profit: <b style="${ssrRenderStyle({ "color": "#00c853" })}" data-v-7d44a4b9>${ssrInterpolate(backtestResult.value.ProfitSum.toFixed(2))}% </b></div><div data-v-7d44a4b9>📉 Max DD: <b data-v-7d44a4b9>${ssrInterpolate(backtestResult.value.MaxDrawdown.toFixed(2))}% </b></div></div>`);
      } else {
        _push(`<!---->`);
      }
      if (backtestEnabled.value && showTradeHistories.value && tradeHistories.value.length) {
        _push(`<div class="trade-history-panel" data-v-7d44a4b9><div class="trade-history-title" data-v-7d44a4b9> 📜 Trade Histories (${ssrInterpolate(tradeHistories.value.length)}) </div><div class="trade-history-list" data-v-7d44a4b9><!--[-->`);
        ssrRenderList(tradeHistories.value, (t, i) => {
          _push(`<div class="${ssrRenderClass([{
            win: t.includes("🏆"),
            loss: t.includes("😡")
          }, "trade-history-item"])}" data-v-7d44a4b9>${ssrInterpolate(t)}</div>`);
        });
        _push(`<!--]--></div></div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div>`);
    };
  }
};
const _sfc_setup$3 = _sfc_main$3.setup;
_sfc_main$3.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("charts.vue");
  return _sfc_setup$3 ? _sfc_setup$3(props, ctx) : void 0;
};
const Charts = /* @__PURE__ */ _export_sfc(_sfc_main$3, [["__scopeId", "data-v-7d44a4b9"]]);
const _sfc_main$2 = {
  __name: "app",
  __ssrInlineRender: true,
  setup(__props) {
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(_attrs)}>`);
      _push(ssrRenderComponent(Charts, null, null, _parent));
      _push(`</div>`);
    };
  }
};
const _sfc_setup$2 = _sfc_main$2.setup;
_sfc_main$2.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("app.vue");
  return _sfc_setup$2 ? _sfc_setup$2(props, ctx) : void 0;
};
const _sfc_main$1 = {
  __name: "nuxt-error-page",
  __ssrInlineRender: true,
  props: {
    error: Object
  },
  setup(__props) {
    const props = __props;
    const _error = props.error;
    const statusCode = Number(_error.statusCode || 500);
    const is404 = statusCode === 404;
    const statusMessage = _error.statusMessage ?? (is404 ? "Page Not Found" : "Internal Server Error");
    const description = _error.message || _error.toString();
    const stack = void 0;
    const _Error404 = defineAsyncComponent(() => import('./error-404-D4lKyPes.mjs'));
    const _Error = defineAsyncComponent(() => import('./error-500-BXxm-3Uj.mjs'));
    const ErrorTemplate = is404 ? _Error404 : _Error;
    return (_ctx, _push, _parent, _attrs) => {
      _push(ssrRenderComponent(unref(ErrorTemplate), mergeProps({ statusCode: unref(statusCode), statusMessage: unref(statusMessage), description: unref(description), stack: unref(stack) }, _attrs), null, _parent));
    };
  }
};
const _sfc_setup$1 = _sfc_main$1.setup;
_sfc_main$1.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../node_modules/nuxt/dist/app/components/nuxt-error-page.vue");
  return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
const _sfc_main = {
  __name: "nuxt-root",
  __ssrInlineRender: true,
  setup(__props) {
    const IslandRenderer = () => null;
    const nuxtApp = useNuxtApp();
    nuxtApp.deferHydration();
    nuxtApp.ssrContext.url;
    const SingleRenderer = false;
    provide(PageRouteSymbol, useRoute());
    nuxtApp.hooks.callHookWith((hooks) => hooks.map((hook) => hook()), "vue:setup");
    const error = /* @__PURE__ */ useError();
    const abortRender = error.value && !nuxtApp.ssrContext.error;
    onErrorCaptured((err, target, info) => {
      nuxtApp.hooks.callHook("vue:error", err, target, info).catch((hookError) => console.error("[nuxt] Error in `vue:error` hook", hookError));
      {
        const p = nuxtApp.runWithContext(() => showError(err));
        onServerPrefetch(() => p);
        return false;
      }
    });
    const islandContext = nuxtApp.ssrContext.islandContext;
    return (_ctx, _push, _parent, _attrs) => {
      ssrRenderSuspense(_push, {
        default: () => {
          if (unref(abortRender)) {
            _push(`<div></div>`);
          } else if (unref(error)) {
            _push(ssrRenderComponent(unref(_sfc_main$1), { error: unref(error) }, null, _parent));
          } else if (unref(islandContext)) {
            _push(ssrRenderComponent(unref(IslandRenderer), { context: unref(islandContext) }, null, _parent));
          } else if (unref(SingleRenderer)) {
            ssrRenderVNode(_push, createVNode(resolveDynamicComponent(unref(SingleRenderer)), null, null), _parent);
          } else {
            _push(ssrRenderComponent(unref(_sfc_main$2), null, null, _parent));
          }
        },
        _: 1
      });
    };
  }
};
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../node_modules/nuxt/dist/app/components/nuxt-root.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
let entry;
{
  entry = async function createNuxtAppServer(ssrContext) {
    const vueApp = createApp(_sfc_main);
    const nuxt = createNuxtApp({ vueApp, ssrContext });
    try {
      await applyPlugins(nuxt, plugins);
      await nuxt.hooks.callHook("app:created", vueApp);
    } catch (error) {
      await nuxt.hooks.callHook("app:error", error);
      nuxt.payload.error ||= createError(error);
    }
    if (ssrContext?._renderResponse) {
      throw new Error("skipping render");
    }
    return vueApp;
  };
}
const entry_default = (ssrContext) => entry(ssrContext);

export { _export_sfc as _, useNuxtApp as a, useRuntimeConfig as b, nuxtLinkDefaults as c, entry_default as default, navigateTo as n, resolveRouteObject as r, useRouter as u };
//# sourceMappingURL=server.mjs.map
