<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import {
  CalendarDays, CheckCircle2, Clock3, CreditCard, AlertTriangle,
  Server, WifiOff, Utensils, LoaderCircle,
} from 'lucide-vue-next';

type Phase = 'idle' | 'loading' | 'success' | 'not-found' | 'error' | 'unknown';
type Health = 'checking' | 'online' | 'offline';

interface User { fio: string; tabnum: string }
interface RegisterResponse {
  success: boolean;
  user: User;
  registeredAt?: string;
}

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');
const CARD_LENGTH = Number(import.meta.env.VITE_SCAN_LENGTH || 10);
const SCAN_PAUSE_MS = 180;
const debugMode = new URLSearchParams(location.search).get('debug') === '1';

const phase = ref<Phase>('idle');
const health = ref<Health>('checking');
const employee = ref<User | null>(null);
const statusDetail = ref('');
const now = ref(new Date());
const debugTabnum = ref('');

const clock = computed(() => new Intl.DateTimeFormat('ru-RU', {
  hour: '2-digit', minute: '2-digit', hour12: false,
}).format(now.value));
const today = computed(() => {
  const date = new Intl.DateTimeFormat('ru-RU', {
    weekday: 'short', day: 'numeric', month: 'long',
  }).format(now.value);
  return date.charAt(0).toUpperCase() + date.slice(1);
});

const headline = computed(() => {
  if (phase.value === 'success') return employee.value?.fio || 'Питание зарегистрировано';
  if (phase.value === 'loading') return 'Проверяем карту…';
  if (phase.value === 'not-found') return 'Сотрудник не найден';
  if (phase.value === 'unknown') return 'Проверьте регистрацию';
  if (phase.value === 'error') return 'Ошибка регистрации';
  return 'Приложите карту';
});
const subtitle = computed(() => {
  if (phase.value === 'success') return 'Питание зарегистрировано';
  if (phase.value === 'loading') return 'Запрос отправлен на сервер';
  if (phase.value === 'not-found') return 'Обратитесь к ответственному сотруднику';
  if (phase.value === 'unknown') return statusDetail.value || 'Не удалось установить результат записи';
  if (phase.value === 'error') return statusDetail.value || 'Попробуйте позже';
  return 'Ожидание сотрудника…';
});

let buffer = '';
let lastKeyTime = 0;
let scanTimer: ReturnType<typeof setTimeout> | undefined;
let resetTimer: ReturnType<typeof setTimeout> | undefined;
let clockTimer: ReturnType<typeof setInterval> | undefined;
let healthTimer: ReturnType<typeof setInterval> | undefined;
let audioContext: AudioContext | undefined;
let scanning = false;

function prepareAudio() {
  try {
    audioContext ||= new AudioContext();
    if (audioContext.state === 'suspended') void audioContext.resume();
  } catch { /* Звук необязателен */ }
}
function beep(ok: boolean) {
  if (!audioContext || audioContext.state !== 'running') return;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = ok ? 780 : 240;
  gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.09, audioContext.currentTime + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.18);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.2);
}

function scheduleIdle() {
  clearTimeout(resetTimer);
  resetTimer = setTimeout(() => {
    if (scanning) return;
    employee.value = null;
    statusDetail.value = '';
    phase.value = 'idle';
  }, 4500);
}

async function checkHealth() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    try {
      const response = await fetch(`${API_URL}/firebird/health`, {
        signal: controller.signal, cache: 'no-store',
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload: unknown = await response.json();
      // Предполагаем { status: 'ok' } от эндпоинта, проверяющего сам Firebird.
      if (!payload || typeof payload !== 'object' || !('status' in payload) || payload.status !== 'ok') {
        throw new Error('Некорректный ответ health');
      }
      health.value = 'online';
    } finally { clearTimeout(timeout); }
  } catch { health.value = 'offline'; }
}

async function register(tabnum: string) {
  if (scanning) return;
  const cleaned = tabnum.trim();
  if (!/^\d{1,32}$/.test(cleaned)) {
    phase.value = 'error';
    statusDetail.value = 'Некорректный номер карты';
    beep(false);
    scheduleIdle();
    return;
  }
  scanning = true;
  clearTimeout(resetTimer);
  phase.value = 'loading';
  employee.value = null;
  statusDetail.value = '';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let response: Response;
    try {
      response = await fetch(`${API_URL}/food/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tabnum: cleaned }),
        signal: controller.signal,
      });
    } finally { clearTimeout(timeout); }

    if (response.status === 404) {
      phase.value = 'not-found';
      beep(false);
      return;
    }
    if (!response.ok) {
      let message = `Сервер ответил: ${response.status}`;
      if (response.status === 409) message = 'Питание уже зарегистрировано';
      if (response.status === 503) message = 'Сервер временно недоступен';
      phase.value = 'error';
      statusDetail.value = message;
      beep(false);
      return;
    }
    const data = await response.json() as RegisterResponse;
    if (data.success !== true || typeof data.user?.fio !== 'string') {
      throw new Error('Некорректный ответ сервера');
    }
    employee.value = data.user;
    phase.value = 'success';
    health.value = 'online';
    beep(true);
  } catch {
    phase.value = 'unknown';
    statusDetail.value = 'Нет подтверждения от сервера. Не прикладывайте карту повторно без проверки.';
    void checkHealth();
    beep(false);
  } finally {
    scanning = false;
    scheduleIdle();
  }
}

function submitBuffer() {
  clearTimeout(scanTimer);
  const value = buffer;
  buffer = '';
  if (value) void register(value);
}

function onKeydown(event: KeyboardEvent) {
  if (event.ctrlKey || event.altKey || event.metaKey || event.isComposing || event.repeat) return;
  const target = event.target;
  if (target instanceof HTMLElement && target.closest('input, textarea, [contenteditable="true"]')) return;
  prepareAudio();

  if (event.key === 'Enter') {
    if (buffer) {
      event.preventDefault();
      submitBuffer();
    }
    return;
  }
  if (!/^\d$/.test(event.key)) return;
  event.preventDefault();
  const time = performance.now();
  if (time - lastKeyTime > 400) buffer = '';
  lastKeyTime = time;
  if (scanning) return;
  buffer += event.key;
  clearTimeout(scanTimer);
  if (CARD_LENGTH > 0 && buffer.length === CARD_LENGTH) {
    scanTimer = setTimeout(submitBuffer, SCAN_PAUSE_MS);
  }
  if (buffer.length > 32) buffer = '';
}

onMounted(() => {
  clockTimer = setInterval(() => { now.value = new Date(); }, 1000);
  void checkHealth();
  healthTimer = setInterval(() => { void checkHealth(); }, 10000);
  window.addEventListener('keydown', onKeydown, true);
});
onUnmounted(() => {
  clearTimeout(scanTimer);
  clearTimeout(resetTimer);
  clearInterval(clockTimer);
  clearInterval(healthTimer);
  window.removeEventListener('keydown', onKeydown, true);
  if (audioContext) void audioContext.close();
});
</script>

<template>
  <div class="terminal-shell" :class="`state-${phase}`">
    <div class="corner-accent" aria-hidden="true"></div>
    <header class="topbar" style="display: flex; align-items: center; justify-content: space-between;">
      <div class="connection" :class="health" role="status" aria-live="polite" style="margin-left: auto">
        <span class="status-dot" aria-hidden="true"></span>
        <span v-if="health === 'online'">Подключено к серверу</span>
        <span v-else-if="health === 'checking'">Проверка соединения</span>
        <span v-else>Нет связи с сервером</span>
      </div>
    </header>

    <main class="content">
      <section class="registration-panel" :class="phase" aria-live="polite" aria-atomic="true">
        <div class="panel-icon">
          <LoaderCircle v-if="phase === 'loading'" class="spin" :size="56" :stroke-width="1.9" />
          <CheckCircle2 v-else-if="phase === 'success'" :size="62" :stroke-width="1.8" />
          <AlertTriangle v-else-if="phase === 'error' || phase === 'unknown' || phase === 'not-found'" :size="60" :stroke-width="1.8" />
          <CreditCard v-else :size="64" :stroke-width="1.8" />
        </div>
        <h1>{{ headline }}</h1>
        <p>{{ subtitle }}</p>
        <span v-if="phase === 'success' && employee" class="employee-number">Табельный № {{ employee.tabnum }}</span>
        <div class="panel-bar" aria-hidden="true"></div>
      </section>
    </main>

    <footer class="footer">
      <div class="time-date">
        <div class="time"><Clock3 :size="28" :stroke-width="1.7" /> <strong>{{ clock }}</strong></div>
        <div class="footer-divider" aria-hidden="true"></div>
        <div class="date"><CalendarDays :size="26" :stroke-width="1.7" /> <span>{{ today }}</span></div>
      </div>
      <span class="footer-hint"><Server :size="16" /> Терминал регистрации</span>
    </footer>

    <form v-if="debugMode" class="debug-panel" @submit.prevent="prepareAudio(); register(debugTabnum)">
      <label for="debug-tab">Тестовый ввод (только ?debug=1)</label>
      <input id="debug-tab" v-model="debugTabnum" type="text" inputmode="numeric" placeholder="Табельный номер" />
      <button type="submit" :disabled="scanning">Отправить</button>
    </form>
  </div>
</template>
