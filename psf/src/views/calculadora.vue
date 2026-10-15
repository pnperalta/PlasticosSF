<script setup>
// node src/serverSQL.js

import { reactive, ref, nextTick, computed, onMounted, onUnmounted } from 'vue'
import { API_URL } from '@/config.js'
 
const TOTAL_FILAS = 20

function crearFila() {
  return {
    codigo: '',
    cantidad: null,
    medida: '',
    tipo: '',
    peso: null,
    pesoTotal: null,
    error: '',
    buscando: false
  }
}

const productos = reactive(Array.from({ length: TOTAL_FILAS }, crearFila))

// Refs de los inputs, uno por fila, para poder moverse con Enter
const codigoInputs = ref([])
const cantidadInputs = ref([])

function setCodigoRef(el, idx) {
  if (el) codigoInputs.value[idx] = el
}
function setCantidadRef(el, idx) {
  if (el) cantidadInputs.value[idx] = el
}

function actualizarTotalFila(fila) {
  const cantidad = Number(fila.cantidad) || 0
  fila.pesoTotal = fila.peso != null ? (Number(fila.peso) * cantidad).toFixed(2) : null
}

async function buscarProducto(idx) {
  const fila = productos[idx]

  if (!fila.codigo) {
    fila.error = ''
    fila.medida = ''
    fila.tipo = ''
    fila.peso = null
    fila.pesoTotal = null
    return
  }

  fila.buscando = true
  fila.error = ''

  try {
    const res = await fetch(`${API_URL}/productospsf/${fila.codigo}`)

    if (!res.ok) {
      fila.error = res.status === 404 ? 'No encontrado' : 'Error'
      fila.medida = ''
      fila.tipo = ''
      fila.peso = null
      fila.pesoTotal = null
      return
    }

    const producto = await res.json()

    fila.medida = producto.medida
    fila.tipo = producto.tipo
    fila.peso = producto.peso
    actualizarTotalFila(fila)
  } catch (err) {
    console.error(err)
    fila.error = 'Sin conexión'
  } finally {
    fila.buscando = false
  }
}

// Enter en "Código": busca el producto y salta a "Cantidad" de la misma fila
async function onEnterCodigo(idx) {
  await buscarProducto(idx)
  await nextTick()
  const input = cantidadInputs.value[idx]
  input?.focus()
  input?.select?.()
}

// Enter en "Cantidad": recalcula el total y salta al "Código" de la fila siguiente
async function onEnterCantidad(idx) {
  actualizarTotalFila(productos[idx])
  await nextTick()
  const siguiente = codigoInputs.value[idx + 1]
  if (siguiente) {
    siguiente.focus()
    siguiente.select?.()
  }
}

function manejarAtajosTeclado(event) {
  if (event.ctrlKey && (event.key === 'ñ' || event.key === 'Ñ')) {
    event.preventDefault()
    limpiarTodo()
  }
}

onMounted(() => {
  window.addEventListener('keydown', manejarAtajosTeclado)
})

onUnmounted(() => {
  window.removeEventListener('keydown', manejarAtajosTeclado)
})

function limpiarTodo() {
  productos.forEach((fila) => Object.assign(fila, crearFila()))
  nextTick(() => {
    codigoInputs.value[0]?.focus()
  })
}

const totalKg = computed(() => {
  const total = productos.reduce((acc, fila) => acc + (Number(fila.pesoTotal) || 0), 0)
  return total.toFixed(2)
})

const productosCargados = computed(() =>
  productos.filter((fila) => fila.pesoTotal !== null).length
)

</script>

<template>
    <div class="calcu-app">
        <header class="app-header">
            <h1 class="titulo-principal" style="margin-top: 1%;">Calculadora</h1>
        </header>
        <div class="atajos-flotante">
          <p class="atajos-titulo">Atajos</p>
          <p><kbd>Ctrl</kbd> + <kbd>Ñ</kbd> limpiar todo</p>
        </div>
        <div class="calculadora-layout">
            <div class="tabla-wrap">
                <table class="tabla-calculo">
                    <thead>
                        <tr>
                            <th class="col-num">N°</th>
                            <th class="col-producto">Producto</th>
                            <th>Medida</th>
                            <th>Tipo</th>
                            <th>KG</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="(fila, idx) in productos"
                            :key="idx"
                        >
                            <td class="col-num">{{ idx + 1 }}</td>
                            <td class="col-producto">
                                <div class="mini-campo">
                                    <span class="mini-label">Código</span>
                                    <input
                                        type="text"
                                        v-model="fila.codigo"
                                        :ref="el => setCodigoRef(el, idx)"
                                        @keyup.enter="onEnterCodigo(idx)"
                                        @change="buscarProducto(idx)"
                                    >
                                </div>
                                <div class="mini-campo">
                                    <span class="mini-label">Cantidad</span>
                                    <input
                                        type="number"
                                        v-model="fila.cantidad"
                                        :ref="el => setCantidadRef(el, idx)"
                                        @keyup.enter="onEnterCantidad(idx)"
                                        @change="actualizarTotalFila(fila)"
                                    >
                                </div>
                            </td>
                            <td class="col-valor">{{ fila.medida || '—' }}</td>
                            <td class="col-valor">{{ fila.tipo || '—' }}</td>
                            <td class="col-valor col-kg">
                                <span v-if="fila.buscando" class="mini-estado">…</span>
                                <span v-else-if="fila.error" class="mini-error">{{ fila.error }}</span>
                                <span v-else>{{ fila.pesoTotal ?? '—' }}</span>
                            </td>
                        </tr>
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="4" class="total-label">Total</td>
                            <td class="total-valor" style="color: white;">{{ totalKg }} kg</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <aside class="panel-resultado card">
                <span class="resultado-eyebrow">Resultado</span>
                <div class="resultado-total">
                    <span class="resultado-total-valor">{{ totalKg }}</span>
                    <span class="resultado-total-unidad">kg</span>
                </div>
                <div class="resultado-detalle">
                    {{ productosCargados }} de {{ productos.length }} productos cargados
                </div>
                <div class="acciones">
                    <button class="btn btn-outline" type="button" @click="limpiarTodo">Limpiar todo</button>
                </div>
            </aside>
        </div>
    </div>

</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Barlow+Semi+Condensed:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500&display=swap');

.calcu-app {
  --ink: #221f1e;
  --ink-soft: #6e6360;
  
  --surface: #ffffff;
  --bg: #f2efee;
  --line: #ddd6d4;
  --accent: #c1272d;
  --accent-dark: #8c1b1f;
  --accent-soft: #f7e6e5;
  --danger: #8c1b1f;
  --danger-soft: #f7e6e5;
  --radius: 10px;
  --shadow: 0 1px 2px rgba(34, 31, 30, 0.07), 0 10px 30px -14px rgba(34, 31, 30, 0.26);
  --font-display: 'Barlow Semi Condensed', sans-serif;
  --font-body: 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  font-family: var(--font-body);
  color: var(--ink);
  background: var(--bg);
  min-height: 100vh;
  padding-bottom: 3rem;
}

html.dark .calcu-app {
  --ink: #d6d6d6;
  --ink-soft: #a4a4a4;
  --surface: #1e1e1e;
  --bg: #141414;
  --line: #333333;
  --accent: #ff6b6b;
  --accent-dark: #ff8787;
  --accent-soft: #3a1f1f;
  --danger: #ff8787;
  --danger-soft: #3a1f1f;
  --shadow: 0 1px 2px rgba(0, 0, 0, 0.4), 0 10px 30px -14px rgba(0, 0, 0, 0.6);
}

td{
  height: 40px;
}

.calcu-app * {
  box-sizing: border-box;
}

.titulo-principal {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: clamp(2.1rem, 5vw, 3rem);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--ink);
  margin: 0;
  padding-bottom: 0.7rem;
  position: relative;
}

.titulo-principal::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 4.5rem;
  height: 0.3rem;
  border-radius: 999px;
  background: var(--accent);
}

.app-header {
  text-align: center;
  padding: 3rem 1.5rem 1.75rem;
}

.eyebrow {
  font-family: var(--font-display);
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--accent-dark);
  margin: 0 0 0.4rem;
}

.app-header h1 {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: clamp(2rem, 4vw, 2.75rem);
  letter-spacing: 0.01em;
  margin: 0;
  color: var(--ink);
}

.fullcalcu {
  flex: 1 1 320px;
  max-width: 380px;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.card.fcalcu {
  padding: 1.75rem 2rem;
}

.card.resultado {
  display: flex;
  justify-content: space-around;
  align-items: stretch;
  padding: 1.5rem 1rem 1.25rem;
  text-align: center;
  gap: 0;
  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, var(--surface) 0%, var(--bg) 100%);
}

.resultado-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem;
  position: relative;
}


.resultado-label {
  font-family: var(--font-display);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 1000;
  font-size: 0.72rem;
  color: rgb(57, 57, 57);
}

.resultado-valor {
  font-family: var(--font-mono);
  letter-spacing: 0.02em;
  font-weight: 600;
  font-size: 1.1rem;
  color: var(--accent-dark);
  background: var(--accent-soft);
  padding: 0.3rem 0.8rem;
  border-radius: 999px;
  min-width: 3.2rem;
  line-height: 1.3;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.1rem 1.5rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.field label {
  font-family: var(--font-display);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--ink-soft);
  margin: 0;
}

.field select {
  font-family: var(--font-body);
  font-size: 0.95rem;
  color: var(--ink);
  background: var(--surface);
  border: 1.5px solid var(--line);
  border-radius: 8px;
  padding: 0.6rem 0.75rem;
  margin: 0;
  width: 100%;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

input {
  font-family: var(--font-body);
  font-size: 0.95rem;
  color: var(--ink);
  background: var(--surface);
  border: 1.5px solid var(--line);
  border-radius: 8px;
  padding: 0.6rem 0.75rem;
  margin: 0;
  width: 100%;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

input:disabled {
  background-color: var(--bg);
  color: var(--ink-soft);
  cursor: not-allowed;
}

.form-submit {
  grid-column: 1 / -1;
  justify-self: start;
  margin-top: 0.4rem;
}

.btn {
  font-family: var(--font-display);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 600;
  font-size: 0.92rem;
  padding: 0.7rem 1.4rem;
  border-radius: 8px;
  border: 1.5px solid transparent;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  transition: background-color 0.18s ease, color 0.18s ease, border-color 0.18s ease, transform 0.18s ease;
}

.btn-primary {
  background: var(--accent);
  color: #ffffff;
}

.btn-primary:hover {
  background: var(--accent-dark);
  transform: translateY(-1px);
}

.btn-outline {
  background: var(--surface);
  border-color: var(--ink-soft);
  color: var(--ink);
}

.btn-outline:hover {
  border-color: var(--accent);
  color: var(--accent-dark);
}

.btn-ghost {
  background: transparent;
  border-color: transparent;
  color: var(--ink-soft);
}

.btn-ghost:hover {
  color: var(--danger);
}

.btn-sm {
  padding: 0.4rem 0.85rem;
  font-size: 0.9rem;
}

.btn:focus-visible,
input:focus-visible {
  outline: 3px solid var(--accent-dark);
  outline-offset: 2px;
}

.btn-imprimir {
  margin-bottom: 2rem;
}

.card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}

/* Inputs — idénticos a Productos */

input {
  font-family: var(--font-body);
  font-size: 0.95rem;
  color: var(--ink);
  background: var(--surface);
  border: 1.5px solid var(--line);
  border-radius: 8px;
  padding: 0.6rem 0.75rem;
  margin: 0;
  width: 100%;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

input:disabled {
  background-color: var(--bg);
  color: var(--ink-soft);
  cursor: not-allowed;
}

/* Layout de la calculadora: tabla + panel de resultado */

.calculadora-layout {
  max-width: 1200px;
  margin-left: 4%;
  padding: 0 1.5rem;
  display: flex;
  align-items: flex-start;
  gap: 1.5rem;
}

.tabla-wrap {
  flex: 1;
  min-width: 0;
  overflow-x: auto;
}

.panel-resultado {
  flex-shrink: 0;
  width: 250px;
  position: sticky;
  top: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  padding: 1.5rem 1.25rem;
  text-align: center;
}

.resultado-eyebrow {
  font-family: var(--font-display);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--accent-dark);
}

.resultado-total {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 0.35rem;
}

.resultado-total-valor {
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: 2.1rem;
  line-height: 1;
  color: var(--accent);
}

.resultado-total-unidad {
  font-family: var(--font-display);
  text-transform: uppercase;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--ink-soft);
}

.resultado-detalle {
  width: 100%;
  border-top: 1px solid var(--line);
  padding-top: 0.6rem;
  font-size: 0.78rem;
  color: var(--ink-soft);
}

.acciones {
  display: flex;
  justify-content: center;
  padding: 0 1.5rem;
}


.tabla-calculo {
  width: 100%;
  min-width: 560px;
  border-collapse: collapse;
  background: var(--surface);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow);
}

.tabla-calculo th {
  background: var(--ink);
  color: var(--surface);
  font-family: var(--font-display);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 600;
  font-size: 0.8rem;
  text-align: left;
  padding: 0.9rem 1.1rem;
}

.tabla-calculo th.col-num {
  text-align: center;
}

.tabla-calculo td {
  border-bottom: 1px solid var(--line);
  padding: 0.6rem 1.1rem;
  vertical-align: middle;
  font-size: 0.92rem;
  color: var(--ink);
}

.tabla-calculo tbody tr:nth-child(even) {
  background: var(--bg);
}

.tabla-calculo tbody tr:hover {
  background: var(--accent-soft);
}

.tabla-calculo tbody tr:last-child td {
  border-bottom: none;
}

.col-num {
  width: 2.75rem;
  text-align: center;
  font-family: var(--font-mono);
  font-weight: 600;
  color: var(--accent-dark);
}

.col-producto {
  min-width: 200px;
}

.mini-campo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.2rem 0;
}

.mini-label {
  font-family: var(--font-display);
  text-transform: uppercase;
  font-size: 0.66rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--ink-soft);
  width: 4.2rem;
  flex-shrink: 0;
}

.mini-campo input {
  padding: 0.28rem 0.5rem;
  font-size: 0.86rem;
}

.col-valor {
  font-family: var(--font-mono);
  font-weight: 600;
  color: var(--accent-dark);
  text-align: center;
  white-space: nowrap;
}

.mini-estado {
  color: var(--ink-soft);
}

.mini-error {
  color: var(--danger);
  font-family: var(--font-body);
  font-weight: 500;
  font-size: 0.76rem;
}

.tabla-calculo tfoot td {
  border-top: 2px solid var(--accent);
  border-bottom: none;
  padding: 0.65rem 1.1rem;
}

.total-label {
  text-align: right;
  font-family: var(--font-display);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 700;
  color: var(--ink);
}

.total-valor {
  text-align: center;
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: 1.05rem;
  color: #ffffff;
  background: var(--accent);
}

/* Atajo flotante */
.atajos-flotante {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 0.9rem 1.1rem;
  font-family: var(--font-body);
  font-size: 0.82rem;
  color: var(--ink);
  line-height: 1.6;
  z-index: 50;
}

.atajos-flotante .atajos-titulo {
  font-family: var(--font-display);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
  font-size: 0.78rem;
  color: var(--ink-soft);
  margin: 0 0 0.4rem;
}

.atajos-flotante p {
  margin: 0.15rem 0;
}

.atajos-flotante kbd {
  font-family: var(--font-mono);
  background: var(--accent);
  border: 1px solid var(--line);
  border-radius: 4px;
  padding: 0.05rem 0.4rem;
  font-size: 0.78rem;
}

/* Responsive */

@media (max-width: 640px) {
  .atajos-flotante {
    bottom: 0.75rem;
    right: 0.75rem;
    left: 0.75rem;
    text-align: center;
  }
}

@media (max-width: 780px) {
  .calculadora-layout {
    flex-direction: column;
  }
  .panel-resultado {
    position: static;
    width: 100%;
    order: -1;
  }
}

@media (max-width: 640px) {
  .calculadora-layout {
    padding: 0 1rem;
  }
  .mini-label {
    width: 3.4rem;
    font-size: 0.6rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .calcu-app *,
  .calcu-app *::before,
  .calcu-app *::after {
    transition: none !important;
    animation: none !important;
  }
}
</style>