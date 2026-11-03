<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { API_URL } from '@/config.js'

const abierto = ref(false)
const cargando = ref(false)
const error = ref('')
const pdfs = ref([])
const busqueda = ref('')
const raiz = ref(null)

const filtrados = computed(() => {
  const q = busqueda.value.trim().toLowerCase()
  return q ? pdfs.value.filter((p) => p.nombre.toLowerCase().includes(q)) : pdfs.value
})

async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    const res = await fetch(`${API_URL}/comandas/pdfs`)
    if (!res.ok) throw new Error()
    pdfs.value = await res.json()
  } catch {
    error.value = 'No se pudo cargar el historial.'
  } finally {
    cargando.value = false
  }
}

function alternar() {
  abierto.value = !abierto.value
  if (abierto.value) cargar()
}

function abrirPdf(nombre) {
  window.open(`${API_URL}/comandas/pdfs/${encodeURIComponent(nombre)}`, '_blank')
}

function formatoFecha(iso) {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function formatoTamano(bytes) {
  return bytes > 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`
}

function clickAfuera(e) {
  if (abierto.value && raiz.value && !raiz.value.contains(e.target)) abierto.value = false
}
function teclaEsc(e) {
  if (e.key === 'Escape') abierto.value = false
}

onMounted(() => {
  document.addEventListener('click', clickAfuera)
  document.addEventListener('keydown', teclaEsc)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', clickAfuera)
  document.removeEventListener('keydown', teclaEsc)
})
</script>

<template>
  <div ref="raiz" class="historial no-print">
    <button type="button" class="historial-btn" :class="{ activo: abierto }" @click="alternar">
      <i class="bi bi-clock-history"></i>
      <span>Historial</span>
      <i class="bi" :class="abierto ? 'bi-chevron-up' : 'bi-chevron-down'"></i>
    </button>

    <div v-if="abierto" class="historial-panel">
      <div class="historial-cabecera">
        <input v-model="busqueda" type="text" placeholder="Buscar comanda..." class="historial-buscar" />
        <button type="button" class="historial-refrescar" title="Actualizar" @click="cargar">
          <i class="bi bi-arrow-clockwise"></i>
        </button>
      </div>

      <div class="historial-lista">
        <p v-if="cargando" class="historial-msg">Cargando...</p>
        <p v-else-if="error" class="historial-msg">{{ error }}</p>
        <p v-else-if="!filtrados.length" class="historial-msg">No hay PDFs guardados.</p>

        <button
          v-for="pdf in filtrados"
          :key="pdf.nombre"
          type="button"
          class="historial-item"
          @click="abrirPdf(pdf.nombre)"
        >
          <i class="bi bi-file-earmark-pdf"></i>
          <span class="historial-datos">
            <span class="historial-nombre">{{ pdf.nombre }}</span>
            <span class="historial-meta">{{ formatoFecha(pdf.fecha) }} · {{ formatoTamano(pdf.tamano) }}</span>
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.historial {
  position: absolute;
  top: 1rem;
  right: 1.5rem;
  z-index: 100;
}

.historial-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.9rem;
  background: var(--color-fondo-panel);
  color: var(--color-texto-suave);
  border: 1px solid var(--color-borde);
  border-radius: 8px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s, border-color 0.15s;
}

.historial-btn i:first-child {
  color: var(--color-acento);
}

.historial-btn:hover,
.historial-btn.activo {
  background: var(--color-fondo-hover);
  color: var(--color-acento-hover);
  border-color: var(--color-acento-hover);
}

/* Panel compacto: nunca ocupa toda la pantalla */
.historial-panel {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  width: 340px;
  max-width: calc(100vw - 2rem);
  background: var(--color-fondo-panel);
  border: 1px solid var(--color-borde);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
  overflow: hidden;
}

.historial-cabecera {
  display: flex;
  gap: 0.4rem;
  padding: 0.6rem;
  border-bottom: 1px solid var(--color-borde-suave);
}

.historial-buscar {
  flex: 1;
  min-width: 0;
  padding: 0.35rem 0.6rem;
  background: var(--color-fondo);
  color: var(--color-texto);
  border: 1px solid var(--color-borde-suave);
  border-radius: 6px;
  font-size: 0.85rem;
}

.historial-refrescar {
  background: transparent;
  border: 1px solid var(--color-borde-suave);
  border-radius: 6px;
  color: var(--color-acento);
  padding: 0 0.6rem;
  cursor: pointer;
}

.historial-refrescar:hover {
  background: var(--color-fondo-hover);
}

.historial-lista {
  max-height: min(55vh, 380px);
  overflow-y: auto;
}

.historial-msg {
  margin: 0;
  padding: 1rem;
  text-align: center;
  color: var(--color-texto-muted);
  font-size: 0.85rem;
}

.historial-item {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  width: 100%;
  padding: 0.55rem 0.8rem;
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--color-borde-suave);
  text-align: left;
  color: var(--color-texto);
  cursor: pointer;
}

.historial-item:last-child {
  border-bottom: 0;
}

.historial-item:hover {
  background: var(--color-fondo-hover);
}

.historial-item > i {
  font-size: 1.4rem;
  color: var(--color-acento);
}

.historial-datos {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.historial-nombre {
  font-size: 0.9rem;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.historial-meta {
  font-size: 0.75rem;
  color: var(--color-texto-muted);
}
</style>