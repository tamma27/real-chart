<template>
  <div class="chart-wrapper" :class="{ fullscreen: isFullscreen }">
    <!-- TOOLBAR -->
    <div class="tv-toolbar">
      <!-- SYMBOL -->
      <div class="tv-symbol-box">
        <span class="tv-search-icon">🔍</span>
        <input
          v-model="inputSymbol"
          list="symbol-list"
          class="tv-symbol-input"
          placeholder="Symbol"
          @focus="onFocusSymbol"
          @keydown.esc.prevent="onEscSymbol"
          @blur="onBlurSymbol"
        />
        <span class="tv-caret">▾</span>
      </div>

      <datalist id="symbol-list">
        <option v-for="c in contracts" :key="c" :value="c" />
      </datalist>

      <!-- TIMEFRAME -->
      <div class="tv-tf-group">
        <button
          v-for="(tf, i) in timeframes"
          :key="tf"
          class="tv-tf-btn"
          :class="{ active: selectedTfIndex === i }"
          @click="selectedTfIndex = i"
        >
          {{ tf }}
        </button>
      </div>

      <label><input type="checkbox" v-model="showOrigin" /> Origin</label>
      <label><input type="checkbox" v-model="showMini" /> Mini</label>

      <button class="tv-fullscreen-btn" @click="toggleFullscreen" :title="isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'">
        {{ isFullscreen ? '⛶' : '⛶' }}
      </button>

      <label>
        <input type="checkbox" v-model="backtestEnabled" />
        Backtest
      </label>

      <!-- BACKTEST SETTINGS (RIGHT SIDE) -->
      <div v-if="backtestEnabled" class="tv-backtest-settings">
        <input
          v-model.number="maxCandles"
          type="number"
          min="1"
          max="10000"
          class="tv-max-input"
          placeholder="Max candles"
        />

        <input
          v-model.number="buffer"
          type="number"
          step="0.01"
          min="0"
          class="tv-max-input"
          style="width:80px"
          placeholder="Buffer"
        />

        <input
          v-model.number="dtlRange"
          type="number"
          step="0.00"
          min="0"
          class="tv-max-input"
          style="width:80px"
          placeholder="DTL Range"
        />

        <button class="tv-update-btn" @click="updateBacktest">
          Update
        </button>
      </div>
    </div>

    <!-- CHART -->
    <div class="chart-area">
      <div class="chart-pct-label" v-if="hoverPct">
        <span class="dot" :class="{ down: hoverPct.startsWith('-') }"></span>
        {{ hoverPct }}
      </div>

      <!-- LOADING OVERLAY -->
      <div v-if="loadingHistory" class="loading-overlay">
        <div class="loading-spinner">
          <div class="spinner"></div>
          <span>Loading...</span>
        </div>
      </div>

      <div ref="chartContainer" class="chart-container"></div>
    </div>

    <div v-if="backtestResult" class="backtest-result">
      <div>📊 Trades: <b>{{ backtestResult.TotalTrades }}</b><input type="checkbox" v-model="showTradeHistories" /></div>
      <div>✅ Win: <b>{{ backtestResult.Success }}</b></div>
      <div>🔥 Loss: <b style="color:#ff5252">
        {{ backtestResult.BurnCount }}
      </b></div>
      <div>💰 Profit: <b style="color:#00c853">
        {{ backtestResult.ProfitSum.toFixed(2) }}%
      </b></div>
      <div>📉 Max DD: <b>
        {{ backtestResult.MaxDrawdown.toFixed(2) }}%
      </b></div>
    </div>

    <div v-if="backtestEnabled && showTradeHistories && tradeHistories.length"
      class="trade-history-panel"
    >
      <div class="trade-history-title">
        📜 Trade Histories ({{ tradeHistories.length }})
      </div>

      <div class="trade-history-list">
        <div
          v-for="(t, i) in tradeHistories"
          :key="i"
          class="trade-history-item"
          :class="{
            win: t.includes('🏆'),
            loss: t.includes('😡')
          }"
        >
          {{ t }}
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
const config = useRuntimeConfig()
const API_BASE = config.public.apiBase
const WS_BASE = config.public.wsBase

import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { createChart, CandlestickSeries, LineSeries, CrosshairMode, createSeriesMarkers } from 'lightweight-charts'

/* ================= CONFIG ================= */

const route = useRoute()
const getQuery = (k, d) => route.query[k] || d

const SYMBOL = getQuery('symbol', 'BTC_USDT')
const INTERVAL = getQuery('interval', '1d')
const HISTORY_LIMIT = getQuery('limit', '2000')
const DEFAULT_VISIBLE_BARS = 120

/* ================= STATE ================= */
const chartContainer = ref(null)
const contracts = ref([])
const timeframes = ['1m', '5m', '30m', '1d']

const selectedTfIndex = ref(
  Math.max(0, timeframes.indexOf(INTERVAL))
)
const selectedInterval = computed(() => timeframes[selectedTfIndex.value])

const activeSymbol = ref(SYMBOL)
const inputSymbol = ref(SYMBOL)
const prevSymbol = ref(SYMBOL)

const showOrigin = ref(true)
const showMini = ref(false)
const hoverPct = ref('')
const isFullscreen = ref(false)
const backtestEnabled = ref(false)
const maxCandles = ref(1000)
const buffer = ref(0.1)
const dtlRange = ref(0.0)
const entryTimes = ref(new Set())
const exitTimes = ref(new Set())

let chart
let series = {}
let candles = []
let ws
let newestTime = null
const loadingHistory = ref(false)
let isInitialLoad = true

const showTradeHistories = ref(false)
const backtestDirty = ref(false) // đánh dấu cần update
const backtestResult = ref(null)
const tradeHistories = ref([]) // array string

/* ================= CHART ================= */
function initChart() {
  if (!chartContainer.value) return

  const containerWidth = chartContainer.value.clientWidth || 800
  chart = createChart(chartContainer.value, {
    width: containerWidth,
    height: 600,
    timeScale: { timeVisible: true },
    crosshair: { mode: CrosshairMode.Normal },
  })

  // Make chart responsive
  const resizeObserver = new ResizeObserver(() => {
    if (chart && chartContainer.value) {
      const height = isFullscreen.value ? window.innerHeight - 60 : 600
      chart.applyOptions({
        width: chartContainer.value.clientWidth,
        height: height,
      })
    }
  })
  resizeObserver.observe(chartContainer.value)

  series.candle = chart.addSeries(CandlestickSeries)

  series.markers = chart.addSeries(LineSeries, {
    lineVisible: true,
    lineWidth: 0,
    color: 'rgba(0,0,0,0)',
    priceLineVisible: false,
    lastValueVisible: false,
  })

  series.up = chart.addSeries(LineSeries, {
    color: '#8e24aa',
    lineWidth: 1,
    priceLineVisible: false,
    lastValueVisible: false,
  })

  series.down = chart.addSeries(LineSeries, {
    color: '#8e24aa',
    lineWidth: 1,
    priceLineVisible: false,
    lastValueVisible: false,
  })

  series.upMini = chart.addSeries(LineSeries, {
    color: '#b39ddb',
    lineWidth: 1,
    priceLineVisible: false,
    lastValueVisible: false,
  })

  series.downMini = chart.addSeries(LineSeries, {
    color: '#b39ddb',
    lineWidth: 1,
    priceLineVisible: false,
    lastValueVisible: false,
  })

  chart.subscribeCrosshairMove(onCrosshairMove)
}

/* ================= CROSSHAIR ================= */
function onCrosshairMove(param) {
  if (!param?.time) {
    // Show latest candle percentage when not hovering
    showLatestCandlePct()
    return
  }

  const t = typeof param.time === 'number'
    ? param.time
    : param.time.timestamp

  const currentIndex = candles.findIndex(x => x.time === t)
  if (currentIndex === -1) {
    showLatestCandlePct()
    return
  }

  const c = candles[currentIndex]
  if (!c || !c.close) {
    showLatestCandlePct()
    return
  }

  if (currentIndex === 0) {
    showLatestCandlePct()
    return
  }

  const prevC = candles[currentIndex - 1]
  if (!prevC || !prevC.close) {
    showLatestCandlePct()
    return
  }

  const priceDiff = c.close - prevC.close
  const pct = ((c.close - prevC.close) / prevC.close) * 100
  const ampl = ((c.high - c.low) / c.low) * 100
  const dtlrange = (c.up - c.down) / c.down * 100
  hoverPct.value = `${priceDiff >= 0 ? '+' : ''}${priceDiff.toFixed(1)} (${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%) | Ampl: ${ampl.toFixed(2)}% | DTL Range: ${dtlrange.toFixed(2)}%`
}

function showLatestCandlePct() {
  if (candles.length < 2) {
    hoverPct.value = ''
    return
  }

  const latest = candles[candles.length - 1]
  const prev = candles[candles.length - 2]

  if (!latest?.close || !prev?.close) {
    hoverPct.value = ''
    return
  }

  const priceDiff = latest.close - prev.close
  const pct = ((latest.close - prev.close) / prev.close) * 100
  const ampl = ((latest.high - latest.low) / latest.low) * 100
  const dtlrange = (latest.up - latest.down) / latest.down * 100
  hoverPct.value = `${priceDiff >= 0 ? '+' : ''}${priceDiff.toFixed(1)} (${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%) | Ampl: ${ampl.toFixed(2)}% | DTL Range: ${dtlrange.toFixed(2)}%`
}

/* ================= UTIL ================= */
const normalize = list =>
  [...new Map(list.map(c => [c.time, c])).values()]
    .sort((a, b) => a.time - b.time)

const lineData = k =>
  candles.filter(c => typeof c[k] === 'number')
         .map(c => ({ time: c.time, value: c[k] }))

function zoomToLastBars(n = DEFAULT_VISIBLE_BARS) {
  if (!candles.length || !chart) return
  chart.timeScale().setVisibleRange({
    from: candles[Math.max(0, candles.length - n)].time,
    to: candles[candles.length - 1].time,
  })
}

/* ================= DATA ================= */
async function loadHistory() {
  if (loadingHistory.value) return
  loadingHistory.value = true

  const url = `${API_BASE}/api/kline/history?symbol=${activeSymbol.value}&interval=${selectedInterval.value}&limit=${HISTORY_LIMIT}`
  const data = await fetch(url).then(r => r.json())
  if (!data?.length) return loadingHistory.value = false

  candles = normalize(data)
  newestTime = candles[candles.length - 1].time

  applyHistory()
  loadingHistory.value = false
}

function connectWS() {
  ws?.close()
  ws = new WebSocket(
    `${WS_BASE}/ws/candle?symbol=${activeSymbol.value}&interval=${selectedInterval.value}`
  )

  ws.onmessage = e => {
    if (loadingHistory.value || !series.candle) return
    const c = JSON.parse(e.data)
    if (newestTime && c.time < newestTime) return

    const last = candles[candles.length - 1]
    last?.time === c.time
      ? candles.splice(-1, 1, c)
      : candles.push(c)

    newestTime = c.time
    series.candle.update(c)

    // Update hover percentage for latest candle
    showLatestCandlePct()
  }
}

function applyHistory() {
  if (!series.candle) return

  let candleData = candles
  if (backtestEnabled.value) {
    candleData = candles.map(c => {
      let color
      if (entryTimes.value.has(c.time)) {
        color = c.close > c.open ? '#00c853' : '#ff1744'
      } else if (exitTimes.value.has(c.time)) {
        color = c.close > c.open ? '#004d40' : '#666666'
      }
      return color ? { ...c, color } : c
    })
  }

  series.candle.setData(candleData)

  showOrigin.value
    ? (series.up.setData(lineData('up')), series.down.setData(lineData('down')))
    : (series.up.setData([]), series.down.setData([]))

  showMini.value
    ? (series.upMini.setData(lineData('upMini')), series.downMini.setData(lineData('downMini')))
    : (series.upMini.setData([]), series.downMini.setData([]))

  // Show latest candle percentage
  showLatestCandlePct()

  if (isInitialLoad) {
    zoomToLastBars()
    isInitialLoad = false
  }
}

async function loadContracts() {
  const data = await fetch(`${API_BASE}/api/contracts`).then(r => r.json())
  contracts.value = data?.map(c => c.contract) || []
}

async function loadBacktest() {
  if (!backtestEnabled.value || !series.candle) return
  if (loadingHistory.value) return
  loadingHistory.value = true

  const url = `${API_BASE}/api/backtest/dtl?symbol=${activeSymbol.value}&interval=${selectedInterval.value}&buffer=${buffer.value}&dtlRange=${dtlRange.value}&max=${maxCandles.value}`
  const data = await fetch(url).then(r => r.json())

  if (!data) return

  entryTimes.value = new Set([...(data.EntryLongHistory || []), ...(data.EntryShortHistory || [])])
  exitTimes.value = new Set([...(data.ExitLongHistory || []), ...(data.ExitShortHistory || [])])

  const markers = []

  // Count long entries per time
  const longEntryCount = new Map()
  ;(data.EntryLongHistory || []).forEach(time => {
    longEntryCount.set(time, (longEntryCount.get(time) || 0) + 1)
  })

  // Count short entries per time
  const shortEntryCount = new Map()
  ;(data.EntryShortHistory || []).forEach(time => {
    shortEntryCount.set(time, (shortEntryCount.get(time) || 0) + 1)
  })

  // Count long exits per time
  const longExitCount = new Map()
  ;(data.ExitLongHistory || []).forEach(time => {
    longExitCount.set(time, (longExitCount.get(time) || 0) + 1)
  })

  // Count short exits per time
  const shortExitCount = new Map()
  ;(data.ExitShortHistory || []).forEach(time => {
    shortExitCount.set(time, (shortExitCount.get(time) || 0) + 1)
  })

  // Long entry markers
  longEntryCount.forEach((count, time) => {
    markers.push({
      time: time,
      position: 'belowBar',
      color: '#00c853',
      shape: 'arrowUp',
      text: count > 1 ? `(${count})` : ''
    })
  })

  // Short entry markers
  shortEntryCount.forEach((count, time) => {
    markers.push({
      time: time,
      position: 'aboveBar',
      color: '#ff1744',
      shape: 'arrowDown',
      text: count > 1 ? `(${count})` : ''
    })
  })

  // Long exit markers
  longExitCount.forEach((count, time) => {
    markers.push({
      time: time,
      position: 'aboveBar',
      color: '#ff1744',
      shape: 'arrowDown',
      text: count > 1 ? `Exit Long (${count})` : 'Exit Long'
    })
  })

  // Short exit markers
  shortExitCount.forEach((count, time) => {
    markers.push({
      time: time,
      position: 'belowBar',
      color: '#00c853',
      shape: 'arrowUp',
      text: count > 1 ? `Exit Short (${count})` : 'Exit Short'
    })
  })

  markers.sort((a, b) => a.time - b.time)

  try {
    createSeriesMarkers(series.candle, markers)
  } catch (e) {
    console.warn('createSeriesMarkers failed:', e.message)
  }

  // 👉 TradeHistories text
  tradeHistories.value = data.TradeHistories || []

  applyHistory()

  backtestResult.value = {
    TotalTrades: data.TotalTrades,
    Success: data.Success,
    BurnCount: data.BurnCount,
    ProfitSum: data.ProfitSum,
    MaxDrawdown: data.MaxDrawdown,
  }
  loadingHistory.value = false
}

/* ================= SYMBOL INPUT ================= */
function onFocusSymbol() {
  prevSymbol.value = activeSymbol.value
  inputSymbol.value = activeSymbol.value
}
function onEscSymbol() {
  inputSymbol.value = prevSymbol.value
}
function onBlurSymbol() {
  if (!contracts.value.includes(inputSymbol.value))
    inputSymbol.value = prevSymbol.value
}

function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value
  if (isFullscreen.value) {
    document.documentElement.requestFullscreen?.() ||
    document.documentElement.webkitRequestFullscreen?.() ||
    document.documentElement.msRequestFullscreen?.()
  } else {
    document.exitFullscreen?.() ||
    document.webkitExitFullscreen?.() ||
    document.msExitFullscreen?.()
  }

  // Update chart size after fullscreen change
  nextTick(() => {
    if (chart && chartContainer.value) {
      chart.applyOptions({
        width: chartContainer.value.clientWidth,
        height: isFullscreen.value ? window.innerHeight - 60 : 600,
      })
    }
  })
}

/* ================= WATCH ================= */
watch(inputSymbol, v => {
  if (contracts.value.includes(v) && v !== activeSymbol.value)
    activeSymbol.value = v
})

watch([activeSymbol, selectedInterval], () => {
  history.replaceState(null, '', `?symbol=${activeSymbol.value}&interval=${selectedInterval.value}`)
  candles = []
  isInitialLoad = true
  loadHistory()
  connectWS()
  if (backtestEnabled.value) {
    entryTimes.value = new Set()
    exitTimes.value = new Set()
    try {
      createSeriesMarkers(series.candle, [])
    } catch (e) {
      // ignore
    }
    if (series.markers) {
      series.markers.setData([])
    }
    loadBacktest()
  }
})

watch([showOrigin, showMini], applyHistory)

watch([backtestEnabled, maxCandles], () => {
  backtestDirty.value = true
})

watch([maxCandles, buffer], () => {
  backtestDirty.value = true
})

// watch(showTradeHistories, v => {
//   if (!v) tradeHistories.value = []
// })

function updateBacktest() {
  if (!backtestEnabled.value) return
  backtestDirty.value = false
  loadBacktest()
}

/* ================= MOUNT ================= */
onMounted(async () => {
  await nextTick()
  initChart()
  await loadContracts()
  await loadHistory()
  connectWS()

  // Show latest candle percentage initially
  showLatestCandlePct()

  // Handle escape key for fullscreen
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isFullscreen.value) {
      toggleFullscreen()
    }
  })
})
</script>

<style scoped>
.chart-wrapper {
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: #0a0a0a;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.chart-wrapper.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
  border-radius: 0;
}

.chart-area {
  position: relative;
  height: 600px;
  background: #0a0a0a;
  transition: height 0.3s ease;
}

.chart-wrapper.fullscreen .chart-area {
  height: calc(100vh - 60px); /* Subtract toolbar height */
}

.chart-wrapper.fullscreen .tv-toolbar {
  position: relative;
  z-index: 10001;
}

.chart-container {
  width: 100%;
  height: 100%;
}

/* ===== TOOLBAR ===== */
.tv-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: #1e222d;
  border-bottom: 1px solid #2a2e39;
}

.tv-symbol-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: #2a2e39;
  border-radius: 6px;
  border: 1px solid #434651;
}

.tv-symbol-input {
  width: 140px;
  background: transparent;
  border: none;
  outline: none;
  color: #d1d4dc;
  font-size: 14px;
  font-weight: 500;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.tv-symbol-input::placeholder {
  color: #787b86;
}

.tv-search-icon {
  color: #787b86;
  font-size: 14px;
}

.tv-caret {
  color: #787b86;
  font-size: 12px;
}

.tv-tf-group {
  display: flex;
  gap: 2px;
  background: #2a2e39;
  border-radius: 6px;
  padding: 2px;
}

.tv-tf-btn {
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 500;
  color: #787b86;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.tv-tf-btn.active {
  background: #2962ff;
  color: #ffffff;
  box-shadow: 0 2px 4px rgba(41, 98, 255, 0.3);
}

.tv-tf-btn:hover:not(.active) {
  background: #3a3f51;
  color: #d1d4dc;
}

.tv-toolbar label {
  color: #d1d4dc;
  font-size: 13px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.tv-toolbar input[type="checkbox"] {
  accent-color: #2962ff;
  width: 14px;
  height: 14px;
}

.tv-max-input {
  width: 100px;
  padding: 6px 8px;
  background: #2a2e39;
  border: 1px solid #434651;
  border-radius: 4px;
  color: #d1d4dc;
  font-size: 13px;
  outline: none;
}

.tv-max-input::placeholder {
  color: #787b86;
}

.tv-fullscreen-btn {
  background: transparent;
  border: none;
  color: #787b86;
  font-size: 16px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tv-fullscreen-btn:hover {
  background: #3a3f51;
  color: #d1d4dc;
}

/* ===== % LABEL ===== */
.chart-pct-label {
  position: absolute;
  top: 10px;
  left: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #d1d4dc;
  background: rgba(30, 34, 45, 0.9);
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid #434651;
  pointer-events: none;
  z-index: 10;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-weight: 500;
  backdrop-filter: blur(8px);
}

.chart-pct-label .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #00c853;
  box-shadow: 0 0 6px rgba(0, 200, 83, 0.4);
}

.chart-pct-label .dot.down {
  background: #ff1744;
  box-shadow: 0 0 6px rgba(255, 23, 68, 0.4);
}

/* Hide crosshair circle */
.chart-container svg g.crosshair circle {
  display: none !important;
}

/* ===== LOADING ===== */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(10, 10, 10, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
  backdrop-filter: blur(2px);
}

.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #d1d4dc;
  font-size: 14px;
  font-weight: 500;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #434651;
  border-top: 3px solid #2962ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.backtest-result {
  display: flex;
  gap: 16px;
  padding: 6px 12px;
  background: #151822;
  border-top: 1px solid #2a2e39;
  font-size: 13px;
  color: #d1d4dc;
}

.tv-backtest-settings {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.tv-update-btn {
  padding: 6px 10px;
  background: #2962ff;
  border: none;
  border-radius: 4px;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
}

.tv-update-btn:hover {
  background: #1e4bd8;
}

.trade-history-panel {
  background: #0f1220;
  border-top: 1px solid #2a2e39;
  padding: 8px 12px;
  max-height: 240px;
  overflow: auto;
}

.trade-history-title {
  font-size: 13px;
  font-weight: 600;
  color: #d1d4dc;
  margin-bottom: 6px;
}

.trade-history-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-family: monospace;
}

.trade-history-item {
  font-size: 12px;
  padding: 4px 6px;
  border-radius: 4px;
  background: #151822;
  color: #cfd8dc;
}

.trade-history-item.win {
  color: #00c853;
}

.trade-history-item.loss {
  color: #ff5252;
}
</style>
