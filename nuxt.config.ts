// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  runtimeConfig: {
    public: {
      apiBase: 'http://139.180.209.227',
      wsBase: 'ws://139.180.209.227',
    },
  },
})
