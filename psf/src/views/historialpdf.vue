<script setup>
import { ref, computed, onMounted } from 'vue'
import { API_URL } from '@/config.js'

const cargando = ref(false)
const error = ref('')
const pdfs = ref([])
const busqueda = ref('')

const filtrados = computed(() => {
  const q = busqueda.value.trim().toLowerCase()
  return q ? pdfs.value.filter((p) => p.nombre.toLowerCase().includes(q)) : pdfs.value
})

async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    const res = await fetch(`${API_URL}/comandas/pdfs`)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || `Error ${res.status}: no se pudo cargar el historial`)
    }
    pdfs.value = await res.json()
  } catch (err) {
    error.value = err.message || 'No se pudo cargar el historial de comandas.'
  } finally {
    cargando.value = false
  }
}

function abrirPdf(nombre) {
  window.open(`${API_URL}/comandas/pdfs/${encodeURIComponent(nombre)}`, '_blank')
}

function obtenerUrlDescarga(nombre) {
  return `${API_URL}/comandas/pdfs/${encodeURIComponent(nombre)}`
}

function formatoFecha(iso) {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatoTamano(bytes) {
  if (!bytes) return '0 KB'
  return bytes > 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`
}

onMounted(() => {
  cargar()
})
</script>

<template>
  <div class="historial-app">
    <header class="historial-header">
      <div class="header-contenido">
        <h1 class="titulo-principal">
          <i class="bi bi-clock-history"></i> Historial de Comandas
        </h1>
        <p class="subtitulo">Comprobantes y comandas respaldadas en formato PDF</p>
      </div>

      <div class="header-acciones">
        <button
          type="button"
          class="btn-actualizar"
          :disabled="cargando"
          @click="cargar"
          title="Actualizar listado"
        >
          <i class="bi bi-arrow-clockwise" :class="{ 'icono-girando': cargando }"></i>
          <span>{{ cargando ? 'Cargando...' : 'Actualizar' }}</span>
        </button>
      </div>
    </header>

    <section class="toolbar-card">
      <div class="busqueda-wrapper">
        <i class="bi bi-search icono-buscar"></i>
        <input
          v-model="busqueda"
          type="text"
          placeholder="Buscar por nombre o número de comanda..."
          class="input-busqueda"
        />
        <button
          v-if="busqueda"
          type="button"
          class="btn-limpiar"
          @click="busqueda = ''"
          title="Limpiar búsqueda"
        >
          <i class="bi bi-x-circle-fill"></i>
        </button>
      </div>

      <div class="resumen-contador">
        <span v-if="busqueda && pdfs.length > 0">
          Mostrando <strong>{{ filtrados.length }}</strong> de <strong>{{ pdfs.length }}</strong>
        </span>
        <span v-else>
          Total: <strong>{{ pdfs.length }}</strong> {{ pdfs.length === 1 ? 'comanda' : 'comandas' }}
        </span>
      </div>
    </section>

    <!-- Estado: Cargando -->
    <div v-if="cargando && pdfs.length === 0" class="mensaje-estado">
      <div class="spinner-border text-danger" role="status"></div>
      <p>Cargando comandas en PDF...</p>
    </div>

    <!-- Estado: Error -->
    <div v-else-if="error" class="mensaje-error">
      <i class="bi bi-exclamation-triangle-fill"></i>
      <p>{{ error }}</p>
      <button type="button" class="btn-reintentar" @click="cargar">Reintentar</button>
    </div>

    <!-- Estado: Sin registros -->
    <div v-else-if="pdfs.length === 0" class="mensaje-vacio">
      <i class="bi bi-folder2-open"></i>
      <h3>No hay PDFs guardados todavía</h3>
      <p>Cuando guardes comandas desde el panel principal, aparecerán aquí para consultarlas o descargarlas.</p>
    </div>

    <!-- Estado: Sin coincidencias con el filtro -->
    <div v-else-if="filtrados.length === 0" class="mensaje-vacio">
      <i class="bi bi-search"></i>
      <h3>Sin coincidencias</h3>
      <p>No se encontraron comandas que coincidan con "<strong>{{ busqueda }}</strong>".</p>
    </div>

    <!-- Tabla de resultados -->
    <div v-else class="tabla-contenedor">
      <table class="tabla-historial">
        <thead>
          <tr>
            <th class="col-icono">Tipo</th>
            <th>Nombre del archivo</th>
            <th>Fecha de guardado</th>
            <th>Tamaño</th>
            <th class="col-acciones text-end">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="pdf in filtrados" :key="pdf.nombre" class="fila-comanda">
            <td class="col-icono">
              <i class="bi bi-file-earmark-pdf-fill icono-pdf"></i>
            </td>
            <td class="col-nombre">
              <span class="nombre-archivo" :title="pdf.nombre">{{ pdf.nombre }}</span>
            </td>
            <td class="col-fecha">
              <i class="bi bi-calendar3 me-1"></i>
              {{ formatoFecha(pdf.fecha) }}
            </td>
            <td class="col-tamano">
              <span class="badge-tamano">{{ formatoTamano(pdf.tamano) }}</span>
            </td>
            <td class="col-acciones text-end">
              <button
                type="button"
                class="btn-accion btn-ver"
                @click="abrirPdf(pdf.nombre)"
                title="Abrir PDF en pestaña nueva"
              >
                <i class="bi bi-box-arrow-up-right"></i>
                <span>Ver</span>
              </button>
              <a
                :href="obtenerUrlDescarga(pdf.nombre)"
                :download="pdf.nombre"
                class="btn-accion btn-descargar"
                title="Descargar archivo PDF"
              >
                <i class="bi bi-download"></i>
                <span>Descargar</span>
              </a>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Barlow+Semi+Condensed:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500&display=swap');

.historial-app {
  /* Paleta y fuentes (igual que Productos) */
  --ink: #221f1e;
  --ink-soft: #6e6360;
  --surface: #ffffff;
  --bg: #f2efee;
  --line: #ddd6d4;
  --accent: #c1272d;
  --accent-dark: #8c1b1f;
  --accent-soft: #f7e6e5;
  --shadow: 0 1px 2px rgba(34, 31, 30, 0.07), 0 10px 30px -14px rgba(34, 31, 30, 0.26);
  --font-display: 'Barlow Semi Condensed', sans-serif;
  --font-body: 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* Alias: las variables que ya usaba Historial apuntan a la nueva paleta */
  --color-texto: var(--ink);
  --color-texto-muted: var(--ink-soft);
  --color-texto-suave: var(--ink-soft);
  --color-borde: var(--line);
  --color-borde-suave: var(--line);
  --color-fondo: var(--bg);
  --color-fondo-panel: var(--surface);
  --color-fondo-hover: var(--accent-soft);
  --color-acento: var(--accent);
  --color-acento-hover: var(--accent-dark);
  --sombra: var(--shadow);

  font-family: var(--font-body);
  color: var(--ink);
  background: var(--bg);
  width: 100%;
  min-height: 100vh;
  padding-block: 1.5rem 3rem;
  /* equivale a max-width 1200px centrado, pero con el fondo a todo el ancho */
  padding-inline: max(2rem, calc((100% - 1200px) / 2 + 2rem));
  box-sizing: border-box;
}


html.dark .historial-app {
  --ink: #d6d6d6;
  --ink-soft: #a4a4a4;
  --surface: #1e1e1e;
  --bg: #141414;
  --line: #333333;
  --accent: #ff6b6b;
  --accent-dark: #ff8787;
  --accent-soft: #3a1f1f;
  --shadow: 0 1px 2px rgba(0, 0, 0, 0.4), 0 10px 30px -14px rgba(0, 0, 0, 0.6);
}

.historial-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-borde);
}

.titulo-principal {
  font-family: var(--font-display);
  font-size: 1.85rem;
  font-weight: 700;
  color: var(--color-texto);
  margin: 0 0 0.3rem 0;
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.titulo-principal i {
  color: var(--color-acento);
}

.subtitulo {
  font-size: 0.95rem;
  color: var(--color-texto-muted);
  margin: 0;
}

.btn-actualizar {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 1.1rem;
  background: var(--surface);
  color: var(--color-texto);
  border: 1px solid var(--color-borde);
  border-radius: 8px;
  font-family: var(--font-display);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-actualizar:hover:not(:disabled) {
  border-color: var(--color-acento);
  color: var(--color-acento-hover);
  background: var(--color-fondo-hover);
}

.btn-actualizar:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.icono-girando {
  animation: rotar 1s linear infinite;
}

@keyframes rotar {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.toolbar-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  background: var(--surface);
  border: 1px solid var(--color-borde);
  border-radius: 10px;
  padding: 0.85rem 1.2rem;
  margin-bottom: 1.5rem;
}

.busqueda-wrapper {
  position: relative;
  flex: 1;
  min-width: 260px;
  max-width: 460px;
  display: flex;
  align-items: center;
}

.icono-buscar {
  position: absolute;
  left: 0.85rem;
  color: var(--color-texto-muted);
  font-size: 0.95rem;
}

.input-busqueda {
  width: 100%;
  padding: 0.5rem 2.2rem 0.5rem 2.4rem;
  background: var(--surface);
  color: var(--color-texto);
  border: 1.5px solid var(--color-borde);
  border-radius: 6px;
  font-family: var(--font-body);
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.input-busqueda:focus {
  border-color: var(--color-acento);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.btn-limpiar {
  position: absolute;
  right: 0.6rem;
  background: transparent;
  border: 0;
  color: var(--color-texto-muted);
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  font-size: 0.95rem;
}

.btn-limpiar:hover {
  color: var(--color-acento-hover);
}

.resumen-contador {
  font-size: 0.9rem;
  color: var(--color-texto-suave);
}

.tabla-contenedor {
  background: var(--surface);
  border: 1px solid var(--color-borde);
  border-radius: 10px;
  overflow-x: auto;
  box-shadow: var(--sombra);
}

.tabla-historial {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.92rem;
}

.tabla-historial thead {
  background: var(--ink);
  border-bottom: 2px solid var(--color-borde);
}

.tabla-historial th {
  padding: 0.85rem 1rem;
  text-align: left;
  font-family: var(--font-display);
  font-weight: 600;
  color: var(--surface);
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.tabla-historial td {
  padding: 0.85rem 1rem;
  border-bottom: 1px solid var(--color-borde-suave);
  vertical-align: middle;
  color: var(--color-texto);
}

.tabla-historial tbody tr:nth-child(even) {
  background: var(--bg);
}

.fila-comanda:hover {
  background: var(--color-fondo-hover) !important;
}

.col-icono {
  width: 48px;
  text-align: center;
}

.icono-pdf {
  font-size: 1.4rem;
  color: var(--color-acento);
}

.col-nombre {
  font-weight: 600;
}

.nombre-archivo {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  word-break: break-all;
}

.col-fecha {
  color: var(--color-texto-suave);
  font-size: 0.88rem;
  white-space: nowrap;
}

.col-tamano {
  white-space: nowrap;
}

.badge-tamano {
  display: inline-block;
  padding: 0.2rem 0.55rem;
  background: var(--accent-soft);
  border: 1px solid transparent;
  border-radius: 4px;
  font-size: 0.8rem;
  color: var(--accent-dark);
  font-family: var(--font-mono);
}

.col-acciones {
  white-space: nowrap;
}

.btn-accion {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  font-family: var(--font-display);
  font-size: 0.82rem;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s ease;
  margin-left: 0.4rem;
}

.btn-ver {
  background: var(--color-acento);
  color: #ffffff;
}

.btn-ver:hover {
  background: var(--color-acento-hover);
  color: #ffffff;
}

.btn-descargar {
  background: var(--surface);
  border-color: var(--color-borde);
  color: var(--color-texto);
}

.btn-descargar:hover {
  background: var(--surface);
  border-color: var(--color-acento);
  color: var(--color-acento-hover);
}

.mensaje-estado,
.mensaje-error,
.mensaje-vacio {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3.5rem 1.5rem;
  text-align: center;
  background: var(--surface);
  border: 1.5px dashed var(--color-borde);
}
</style>  