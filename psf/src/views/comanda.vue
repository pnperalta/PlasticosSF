<script setup>
// node src/serverSQL.js

import { reactive, ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import html2pdf from 'html2pdf.js'

const comanda = reactive({
  codigoCliente: '',
  vendedor: '',
  etiqueta: '',
  numero: '',
  obs: '',
  codigoProducto: '',
  cantidad: null,
  razonSocial: '',
  diaFecha: '',
  mesFecha: '',
  ordenCompra: ''
})

// Datos del cliente que se busca por código
const clienteInfo = reactive({
  opciones: [],            // filas que devuelve el backend (puede haber más de una etiqueta para el mismo código)
  etiquetaSeleccionada: '',
  buscando: false,
  error: ''
})

async function manejarEnterCodigoCliente(event) {
  await buscarCliente()
  await nextTick()

  if (clienteInfo.opciones.length > 1) {
    const formulario = event.target.closest('form')
    const select = formulario?.querySelector('#etiqueta-select')
    if (select) {
      select.focus()
      return
    }
  }

  if (clienteInfo.opciones.length === 1) {
    focusTipoComanda(event)
    return
  }

  irCampoSiguiente(event)
}

// justo antes de buscarCliente, en el scope del <script setup>
let ultimoCodigoBuscado = null

async function buscarCliente() {
  const codigo = comanda.codigoCliente

  // Evita repetir la búsqueda cuando el blur se dispara solo porque
  // movimos el foco a mano (ej: al select de etiquetas tras Enter).
  if (codigo === ultimoCodigoBuscado) return
  ultimoCodigoBuscado = codigo

  clienteInfo.opciones = []
  clienteInfo.etiquetaSeleccionada = ''
  clienteInfo.error = ''
  comanda.vendedor = ''
  comanda.etiqueta = ''
  comanda.razonSocial = ''

  if (!codigo) return

  clienteInfo.buscando = true
  try {
    const res = await fetch(`http://localhost:3000/clientes/${codigo}`)

    if (!res.ok) {
      clienteInfo.error = res.status === 404 ? 'Cliente no encontrado.' : 'Error al buscar el cliente.'
      return
    }

    const filas = await res.json()
    clienteInfo.opciones = filas

    if (filas.length === 1) {
      seleccionarEtiqueta(filas[0].etiquetas)
    }
  } catch (err) {
    console.error(err)
    clienteInfo.error = 'No se pudo conectar con el servidor.'
  } finally {
    clienteInfo.buscando = false
  }
}

function seleccionarEtiqueta(etiqueta) {
  clienteInfo.etiquetaSeleccionada = etiqueta
  const fila = clienteInfo.opciones.find(c => c.etiquetas === etiqueta)
  if (fila) {
    comanda.etiqueta = fila.etiquetas
    comanda.vendedor = fila.vendedor
    comanda.razonSocial = fila.razonsocial
  }
}

const calculo = reactive({
  codigoProducto: '',
  cantidad: null
})

const filas = reactive([crearFila()])

function crearFila() {
  return {
    id: crypto.randomUUID(),
    codigoProducto: '',
    cantidad: null,
    tipo: '',
    medida: '',
    peso: null,
    buscando: false,
    error: ''
  }
}

function agregarFila() {
  if (filasActivas.value.length < 6) filasActivas.value.push(crearFila())
}

function quitarFila(id) {
  const index = filasActivas.value.findIndex(f => f.id === id)
  if (index !== -1) filasActivas.value.splice(index, 1)
}

async function manejarEnterCantidad(fila, event) {
  if (filasActivas.value.length < 6) {
    agregarFila()
    await nextTick() // esperamos a que Vue pinte la fila nueva en el DOM

    const formulario = event.target.closest('form')
    const nuevaFila = filasActivas.value[filasActivas.value.length - 1]
    const siguienteInput = formulario?.querySelector(`#codp-${nuevaFila.id}`)

    if (siguienteInput) {
      siguienteInput.focus()
      siguienteInput.select()
    }
  } else {
    // ya hay 6 filas, no se puede agregar más: nos comportamos como siempre
    irCampoSiguiente(event)
  }
}

// --- Tipo de comanda: única o múltiple ---

function focusTipoComanda(event) {
  const formulario = event.target.closest('form')
  const tipoComandaSelect = formulario?.querySelector('#tipo-comanda')
  if (tipoComandaSelect) {
    tipoComandaSelect.focus()
  } else {
    irCampoSiguiente(event)
  }
}

const tipoComanda = ref('unica') // 'unica' | 'multiple'

const comandasMultiples = reactive({
  cantidad: null,
  confirmada: false,
  lotes: [],
  indiceActual: 0,
  editandoCantidad: false,   // ← esta línea es nueva
  error: ''
})

function crearLote(base = null) {
  return {
    id: crypto.randomUUID(),
    obs: base?.obs ?? '',
    diaFecha: base?.diaFecha ?? '',
    mesFecha: base?.mesFecha ?? '',
    ordenCompra: base?.ordenCompra ?? '',
    filas: [crearFila()]
  }
}

function confirmarCantidadComandas() {
  const cantidad = Number(comandasMultiples.cantidad)
  if (!cantidad || cantidad < 2) {
    comandasMultiples.error = 'Ingresá una cantidad de 2 o más.'
    return
  }

  const actuales = comandasMultiples.lotes.length

  if (cantidad > actuales) {
    for (let i = actuales; i < cantidad; i++) {
      // Solo la primera comanda que se crea arranca con lo que ya
      // se había tipeado en modo "única" (si había algo cargado).
      // Las siguientes se completan solas cuando entrás a cada una
      // (ver el watch de indiceActual, más abajo).
      const base = (i === 0)
        ? { obs: comanda.obs, diaFecha: comanda.diaFecha, mesFecha: comanda.mesFecha, ordenCompra: comanda.ordenCompra }
        : null
      comandasMultiples.lotes.push(crearLote(base))
    }
  } else if (cantidad < actuales) {
    const loteConDatos = comandasMultiples.lotes
      .slice(cantidad)
      .some(lote =>
        lote.filas.some(f => f.codigoProducto || f.cantidad) ||
        lote.obs || lote.diaFecha || lote.mesFecha || lote.ordenCompra
      )

    if (loteConDatos) {
      const confirmado = window.confirm(
        `Vas a reducir a ${cantidad} comanda(s). Las comandas ${cantidad + 1} a ${actuales} tienen productos cargados y se van a perder. ¿Continuar?`
      )
      if (!confirmado) return
    }

    comandasMultiples.lotes.splice(cantidad)
  }

  comandasMultiples.error = ''
  comandasMultiples.confirmada = true
  comandasMultiples.editandoCantidad = false

  if (comandasMultiples.indiceActual > comandasMultiples.lotes.length - 1) {
    comandasMultiples.indiceActual = comandasMultiples.lotes.length - 1
  } 


}

// Al cambiar de comanda con los botones de navegación: si la comanda
// a la que entrás todavía no tiene nada cargado (obs/fecha/OC vacíos),
// le copiamos lo de la comanda de la que veníamos, como punto de
// partida. Vos después solo cambiás lo que sea distinto.
watch(
  () => comandasMultiples.indiceActual,
  (nuevoIndice, indiceAnterior) => {
    if (!comandasMultiples.confirmada) return

    const loteAnterior = comandasMultiples.lotes[indiceAnterior]
    const loteNuevo = comandasMultiples.lotes[nuevoIndice]
    if (!loteAnterior || !loteNuevo) return

    const estaVacio = !loteNuevo.obs && !loteNuevo.diaFecha && !loteNuevo.mesFecha && !loteNuevo.ordenCompra
    if (estaVacio) {
      loteNuevo.obs = loteAnterior.obs
      loteNuevo.diaFecha = loteAnterior.diaFecha
      loteNuevo.mesFecha = loteAnterior.mesFecha
      loteNuevo.ordenCompra = loteAnterior.ordenCompra
    }
  }
)

function cambiarCantidadComandas() {
  comandasMultiples.cantidad = comandasMultiples.lotes.length
  comandasMultiples.editandoCantidad = true
  comandasMultiples.error = ''
}

function cancelarCambioCantidad() {
  comandasMultiples.editandoCantidad = false
  comandasMultiples.error = ''
}

watch(tipoComanda, (valor) => {
  if (valor === 'unica') {
    comandasMultiples.confirmada = false
    comandasMultiples.lotes = []
    comandasMultiples.cantidad = null
    comandasMultiples.indiceActual = 0
  }
})

// Productos que se están editando ahora: los de la comanda única,
// o los del lote actual si el tipo es múltiple
const filasActivas = computed(() => {
  if (tipoComanda.value === 'multiple' && comandasMultiples.confirmada) {
    return comandasMultiples.lotes[comandasMultiples.indiceActual].filas
  }
  return filas
})

// Objeto con obs/fecha/OC "activo": el de la comanda única,
// o el del lote que se está editando si el tipo es múltiple.
// Al cambiar de lote, cada uno mantiene lo suyo (no se pisan entre sí).
const datosActivos = computed(() => {
  if (tipoComanda.value === 'multiple' && comandasMultiples.confirmada) {
    return comandasMultiples.lotes[comandasMultiples.indiceActual]
  }
  return comanda
})

const gruposImpresion = computed(() => {
  if (tipoComanda.value === 'multiple' && comandasMultiples.confirmada) {
    return comandasMultiples.lotes.map((lote, index) => ({
      filas: lote.filas,
      obs: lote.obs,
      diaFecha: lote.diaFecha,
      mesFecha: lote.mesFecha,
      ordenCompra: lote.ordenCompra,
      posicion: index + 1,
      total: comandasMultiples.lotes.length
    }))
  }
  return [{
    filas,
    obs: comanda.obs,
    diaFecha: comanda.diaFecha,
    mesFecha: comanda.mesFecha,
    ordenCompra: comanda.ordenCompra,
    posicion: null,
    total: null
  }]
})

function manejarAtajosTeclado(event) {
  if (event.ctrlKey && (event.key === 'p' || event.key === 'P')) {
    event.preventDefault()
    imprimir()
  } else if (event.ctrlKey && (event.key === 'ñ' || event.key === 'Ñ')) {
    event.preventDefault()
    limpiarComanda()
  } else if (event.ctrlKey && (event.key === 'ArrowRight')) {
    event.preventDefault()
    comandasMultiples.indiceActual++
  } else if (event.ctrlKey && (event.key === 'ArrowLeft')) {
    event.preventDefault()
    comandasMultiples.indiceActual--
  }
}

const vistaGenerada = ref(false)

const ESTADO_STORAGE_KEY = 'psf_comanda_estado_trabajo'

function guardarEstadoTrabajo() {
  try {
    localStorage.setItem(ESTADO_STORAGE_KEY, JSON.stringify({
      comanda: { ...comanda },
      clienteInfo: {                                    // ← NUEVO
        opciones: clienteInfo.opciones,                  // ← NUEVO
        etiquetaSeleccionada: clienteInfo.etiquetaSeleccionada  // ← NUEVO
      },                 
      filas: filas.map(f => ({ ...f })),
      tipoComanda: tipoComanda.value,
      comandasMultiples: {
        cantidad: comandasMultiples.cantidad,
        confirmada: comandasMultiples.confirmada,
        indiceActual: comandasMultiples.indiceActual,
        lotes: comandasMultiples.lotes.map(l => ({
          ...l,
          filas: l.filas.map(f => ({ ...f }))
        }))
      },
      vistaGenerada: vistaGenerada.value
    }))
  } catch (err) {
    console.error('No se pudo guardar el estado de la comanda', err)
  }
}

function cargarEstadoTrabajo() {
  try {
    const guardado = localStorage.getItem(ESTADO_STORAGE_KEY)
    if (!guardado) return
    const estado = JSON.parse(guardado)

    if (estado.comanda) Object.assign(comanda, estado.comanda)

    if (estado.clienteInfo) {                                          // ← NUEVO
      clienteInfo.opciones = estado.clienteInfo.opciones || []          // ← NUEVO
      clienteInfo.etiquetaSeleccionada = estado.clienteInfo.etiquetaSeleccionada || ''  // ← NUEVO
    }     
    if (Array.isArray(estado.filas) && estado.filas.length) {
      filas.splice(0, filas.length, ...estado.filas)
    }
    if (estado.comandasMultiples) {
      comandasMultiples.cantidad = estado.comandasMultiples.cantidad
      comandasMultiples.confirmada = estado.comandasMultiples.confirmada
      comandasMultiples.indiceActual = estado.comandasMultiples.indiceActual || 0
      comandasMultiples.lotes = estado.comandasMultiples.lotes || []
    }
    if (estado.tipoComanda) tipoComanda.value = estado.tipoComanda
    if (typeof estado.vistaGenerada === 'boolean') vistaGenerada.value = estado.vistaGenerada

    ultimoCodigoBuscado = comanda.codigoCliente || null
  } catch (err) {
    console.error('No se pudo leer el estado guardado de la comanda', err)
  }
}

onMounted(() => {
  cargarContadorGuardado()
  cargarEstadoTrabajo()
  window.addEventListener('keydown', manejarAtajosTeclado)
})

onUnmounted(() => {
  window.removeEventListener('keydown', manejarAtajosTeclado)
})

watch(
  () => [
    comanda,
    filas,
    tipoComanda.value,
    comandasMultiples,
    vistaGenerada.value,
    clienteInfo.opciones,              // ← NUEVO
    clienteInfo.etiquetaSeleccionada   // ← NUEVO
  ],
  guardarEstadoTrabajo,
  { deep: true }
)

async function buscarProductoFila(fila) {
  fila.tipo = ''
  fila.medida = ''
  fila.peso = null
  fila.error = ''

  if (!fila.codigoProducto) return

  fila.buscando = true
  try {
    const res = await fetch(`http://localhost:3000/productospsf/${fila.codigoProducto}`)

    if (!res.ok) {
      fila.error = res.status === 404 ? 'Producto no encontrado.' : 'Error al buscar el producto.'
      return
    }

    const producto = await res.json()
    fila.tipo = producto.tipo
    fila.medida = producto.medida
    fila.peso = producto.peso
  } catch (err) {
    console.error(err)
    fila.error = 'No se pudo conectar con el servidor.'
  } finally {
    fila.buscando = false
  }
}

function pesoTotalFila(fila) {
  if (fila.peso === null) return null
  const cantidad = Number(fila.cantidad) || 0
  const pesoUnitario = Number(fila.peso) || 0
  return Math.round(pesoUnitario * cantidad)
}

function pesoTotalDe(filasArr) {
  const total = filasArr.reduce((acc, fila) => {
    const sub = pesoTotalFila(fila)
    return acc + (sub || 0)
  }, 0)
  return Math.round(total)
}

function cantidadTotalDe(filasArr) {
  return filasArr.reduce((acc, fila) => acc + (Number(fila.cantidad) || 0), 0)
}

const resultadoCalculo = reactive({
  medida: '',
  tipo: '',
  peso: null,       // peso unitario que viene de la BD
  pesoTotal: null,  // peso * cantidad
  buscando: false,
  error: ''
})

async function calcularProducto() {
  if (!calculo.codigoProducto) {
    resultadoCalculo.error = 'Ingresá un código de producto.'
    return
  }

  resultadoCalculo.buscando = true
  resultadoCalculo.error = ''

  try {
    const res = await fetch(`http://localhost:3000/productospsf/${calculo.codigoProducto}`)

    if (!res.ok) {
      resultadoCalculo.error = res.status === 404 ? 'Producto no encontrado.' : 'Error al buscar el producto.'
      resultadoCalculo.medida = ''
      resultadoCalculo.tipo = ''
      resultadoCalculo.peso = null
      resultadoCalculo.pesoTotal = null
      return
    }

    const producto = await res.json()
    const cantidad = Number(calculo.cantidad) || 0

    resultadoCalculo.medida = producto.medida
    resultadoCalculo.tipo = producto.tipo
    resultadoCalculo.peso = producto.peso
    resultadoCalculo.pesoTotal = (Number(producto.peso) * cantidad).toFixed(2)
  } catch (err) {
    console.error(err)
    resultadoCalculo.error = 'No se pudo conectar con el servidor.'
  } finally {
    resultadoCalculo.buscando = false
  }
}

// --- Contador de comandas ---
const CONTADOR_STORAGE_KEY = 'psf_comanda_contador'

const contador = reactive({
  inicio: 1,
  actual: 1,
  activo: false
})

// Carga lo que haya quedado guardado de una sesión anterior (si la hay)
function cargarContadorGuardado() {
  try {
    const guardado = localStorage.getItem(CONTADOR_STORAGE_KEY)
    if (!guardado) return

    const datos = JSON.parse(guardado)
    if (typeof datos.inicio === 'number') contador.inicio = datos.inicio
    if (typeof datos.actual === 'number') contador.actual = datos.actual
    if (typeof datos.activo === 'boolean') contador.activo = datos.activo
  } catch (err) {
    console.error('No se pudo leer el contador guardado', err)
  }
}

// Persiste el estado del contador para que sobreviva a un cierre de página
function guardarContador() {
  try {
    localStorage.setItem(CONTADOR_STORAGE_KEY, JSON.stringify({
      inicio: contador.inicio,
      actual: contador.actual,
      activo: contador.activo
    }))
  } catch (err) {
    console.error('No se pudo guardar el contador', err)
  }
}

onMounted(() => {
  cargarContadorGuardado()
})

// Cada vez que cambia el contador, lo guardamos
watch(
  () => [contador.inicio, contador.actual, contador.activo],
  guardarContador
)

function iniciarContador() {
  const desde = Number(contador.inicio) || 1
  contador.inicio = desde
  contador.actual = desde
  contador.activo = true
}

function reiniciarContador() {
  // Pedimos confirmación antes de permitir tocar un contador que ya está en marcha,
  // para evitar que se reinicie el número de comanda sin querer.
  const confirmado = window.confirm(
    `El contador está en el N° ${contador.actual}. ¿Seguro que querés cambiarlo? Esto va a pedir un nuevo número de inicio.`
  )
  if (!confirmado) return

  contador.activo = false
}

function ajustarContador(delta) {
  contador.actual = Math.max(1, contador.actual + delta)
}

watch(
  () => contador.actual,
  (valor) => {
    if (contador.activo) comanda.numero = String(valor)
  },
  { immediate: true }
)

const fechaHoy = computed(() => {
  const hoy = new Date()
  return hoy.toLocaleDateString('es-AR')
})

// Se imprimen siempre dos hojas: el original y su duplicado
const copias = [
  { etiqueta: '' },
  { etiqueta: 'DUPLICADO' }
]

function generarVistaPrevia() {
  vistaGenerada.value = true
}

function limpiarComanda() {
  comanda.codigoCliente = ''
  ultimoCodigoBuscado = null   
  comanda.vendedor = ''
  comanda.etiqueta = ''
  comanda.obs = ''
  comanda.diaFecha = ''
  comanda.mesFecha = ''
  comanda.ordenCompra = ''
  comanda.razonSocial = ''

  // Si el contador está activo, el número de orden lo sigue manejando él;
  // si no está activo, también lo dejamos vacío.
  if (!contador.activo) comanda.numero = ''

  clienteInfo.opciones = []
  clienteInfo.etiquetaSeleccionada = ''
  clienteInfo.error = ''

// Volvemos a dejar una sola fila de producto, vacía
  filas.splice(0, filas.length, crearFila())

  // Reseteamos también el tipo de comanda y los lotes múltiples, si había
  tipoComanda.value = 'unica'
  comandasMultiples.confirmada = false
  comandasMultiples.lotes = []
  comandasMultiples.cantidad = null
  comandasMultiples.indiceActual = 0

  vistaGenerada.value = false
  localStorage.removeItem(ESTADO_STORAGE_KEY)
}

async function imprimir() {
  if (!vistaGenerada.value) generarVistaPrevia()
  await nextTick()

  const imagenes = Array.from(document.querySelectorAll('#impresion img'))
  await Promise.all(
    imagenes.map((img) => {
      if (img.complete) return Promise.resolve()
      return new Promise((resolve) => {
        img.addEventListener('load', resolve, { once: true })
        img.addEventListener('error', resolve, { once: true })
      })
    })
  )

  await guardarBackupComanda()

  const pdfBlob = await generarPdfBlob()
  await guardarPdfComanda(pdfBlob)

  window.print()
  if (contador.activo) contador.actual++
}

async function guardarBackupComanda() {
  try {
    await fetch('http://localhost:3000/comandas/backup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        numero: comanda.numero,
        fecha: fechaHoy.value,
        codigoCliente: comanda.codigoCliente,
        razonSocial: comanda.razonSocial,
        vendedor: comanda.vendedor,
        etiqueta: comanda.etiqueta,
        grupos: gruposImpresion.value
      })
    })
  } catch (err) {
    console.error('No se pudo guardar el backup de la comanda', err)
  }
}

async function generarPdfBlob() {
  const elemento = document.getElementById('impresion')
  if (document.fonts?.ready) {
    await document.fonts.ready
  }

  elemento.classList.add('pdf-render')

 const opciones = {
    margin: [10, 0, 0, 0], // top, left, bottom, right (mm) — mismo margen arriba en TODAS las páginas
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['css', 'legacy'], after: '.hoja:not(:last-child)' } // evita el salto después de la última hoja
  }

  try {
    return await html2pdf().set(opciones).from(elemento).outputPdf('blob')
  } finally {
    elemento.classList.remove('pdf-render')
  }
}

async function guardarPdfComanda(blobPdf) {
  const nombreArchivo = `comanda-${comanda.numero || 'sin-numero'}.pdf`
  const formData = new FormData()
  formData.append('pdf', blobPdf, nombreArchivo)

  try {
    const res = await fetch('http://localhost:3000/comandas/backup-pdf', {
      method: 'POST',
      body: formData
    })
    if (!res.ok) throw new Error('Error al guardar el PDF')
  } catch (err) {
    console.error('No se pudo guardar el PDF de la comanda', err)
  }
}

function fechaCorta(dia, mes) {
  if (!dia || !mes) return ''
  return `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}`
}

// --- Navegación con Enter ---
// Al presionar Enter en un campo, evita que se envíe el formulario
// (eso queda reservado para el botón "Vista previa")
function evitarEnvioPorEnter(event) {
  const objetivo = event.target
  if (objetivo.tagName === 'INPUT' || objetivo.tagName === 'SELECT') {
    event.preventDefault()
  }
}

// Mueve el foco al próximo campo habilitado del formulario.
// Si ya era el último campo, genera la vista previa directamente.
function irCampoSiguiente(event) {
  const formulario = event.target.closest('form')
  if (!formulario) return

  const campos = Array.from(
    formulario.querySelectorAll('input:not([disabled]), select:not([disabled])')
  )
  const indiceActual = campos.indexOf(event.target)
  if (indiceActual === -1) return

  const siguienteCampo = campos[indiceActual + 1]
  if (siguienteCampo) {
    siguienteCampo.focus()
    if (typeof siguienteCampo.select === 'function') siguienteCampo.select()
  } else {
    generarVistaPrevia()
  }
}

</script>

<template>
  <div class="comanda-app">
    <header class="app-header no-print">
      <p class="eyebrow">Producción</p>
      <h1 class="titulo-principal">Comanda</h1>
      <p class="numero-badge">N° de comanda: <strong>{{ comanda.numero || '—' }}</strong></p>
    </header>

    <div class="card contador-panel no-print">
      <template v-if="!contador.activo">
        <div class="field field-inline">
          <label for="contador-inicio">Iniciar contador de comandas desde</label>
          <input type="number" id="contador-inicio" min="1" v-model.number="contador.inicio" @keyup.enter="iniciarContador">
        </div>
        <button type="button" class="btn btn-primary" @click="iniciarContador" style="margin-left:19%; margin-top: 6%;">Iniciar contador</button>
      </template>
      <template v-else>
        <span class="contador-info">Próximo N°: <strong>{{ contador.actual  + 1}}</strong></span>
        <button type="button" class="btn btn-sm btn-ghost" @click="reiniciarContador" style="margin-left:24%">Reiniciar contador</button>
      </template>
    </div>

    <div class="atajos-flotante no-print">
      <p class="atajos-titulo">Atajos</p>
      <p><kbd>Ctrl</kbd> + <kbd>P</kbd> imprimir</p>
      <p><kbd>Ctrl</kbd> + <kbd>Ñ</kbd> limpiar comanda</p>
      <p class="atajos-titulo" style="margin-top: 0.5rem;">Comanda multiple</p>
      <p><kbd>Ctrl</kbd> + <kbd>⬅</kbd> comanda anterior</p>
      <p><kbd>Ctrl</kbd> + <kbd>➡</kbd> siguiente comanda</p>
    </div>

    <div class="pantalla no-print">
      <div class="card comanda">
        <h2 class="card-title">Datos de la comanda</h2>
        <form action="" method="post" class="form-grid" @submit.prevent="generarVistaPrevia" @keydown.enter="evitarEnvioPorEnter">
        <div class="field">
            <label for="codc">Código de cliente</label>
            <input
              type="number"
              id="codc"
              name="codc"
              v-model="comanda.codigoCliente"
              @blur="buscarCliente"
              @keyup.enter="manejarEnterCodigoCliente"
          >
        </div>

        <div class="field" style="grid-column: 1 / -1;" v-if="clienteInfo.opciones.length > 1">
          <label for="etiqueta-select">Este cliente tiene varias etiquetas — elegí una</label>
          <select
            id="etiqueta-select"
            v-model="clienteInfo.etiquetaSeleccionada"
            @change="seleccionarEtiqueta(clienteInfo.etiquetaSeleccionada)"
            @keyup.enter="focusTipoComanda"
          >
            <option disabled value="">Elegí una etiqueta</option>
            <option v-for="c in clienteInfo.opciones" :key="c.etiquetas" :value="c.etiquetas">
              {{ c.etiquetas }} — {{ c.razonsocial }}
            </option>
          </select>
        </div>

          <div class="field">
            <label for="vendedor">Vendedor</label>
            <input type="text" id="vendedor" name="vendedor" v-model="comanda.vendedor" @keyup.enter="irCampoSiguiente">
          </div>
          <div class="field">
            <label for="etiqueta">Etiqueta</label>
            <input type="text" id="etiqueta" name="etiqueta" v-model="comanda.etiqueta" @keyup.enter="irCampoSiguiente">
          </div>
          <div class="field" style="grid-column: 1 / -1;">
            <label for="tipo-comanda">Tipo de comanda</label>
            <select id="tipo-comanda" v-model="tipoComanda" @keyup.enter="irCampoSiguiente">
              <option value="unica">Comanda única (hasta 6 productos)</option>
              <option value="multiple">Comandas múltiples</option>
            </select>

            <div v-if="tipoComanda === 'multiple' && (!comandasMultiples.confirmada || comandasMultiples.editandoCantidad)" class="field field-inline" style="margin-top: 0.5rem;">
              <label for="cantidad-comandas">
                {{ comandasMultiples.confirmada ? 'Nueva cantidad de comandas' : 'Cantidad de comandas' }}
              </label>
              <input type="number" id="cantidad-comandas" min="2" v-model.number="comandasMultiples.cantidad" @keyup.enter="(e) => { confirmarCantidadComandas(); irCampoSiguiente(e) }">
              <button type="button" class="btn btn-sm btn-primary" @click="confirmarCantidadComandas">Confirmar</button>
              <button
              v-if="comandasMultiples.editandoCantidad"
              type="button"
              class="btn btn-sm btn-ghost"
              @click="cancelarCambioCantidad"
              >Cancelar</button>
            </div>
            <p v-if="comandasMultiples.error" class="state-msg" style="color: var(--danger);">{{ comandasMultiples.error }}</p>

            <div v-if="tipoComanda === 'multiple' && comandasMultiples.confirmada && !comandasMultiples.editandoCantidad" class="lote-nav" style="margin-top: 0.5rem;">
              <span>Editando comanda <strong>{{ comandasMultiples.indiceActual + 1 }}/{{ comandasMultiples.lotes.length }}</strong></span>
              <div class="sa-comanda">
              <button
                type="button"
                class="btn btn-sm btn-outline"
                v-if="comandasMultiples.indiceActual > 0"
                @click="comandasMultiples.indiceActual--"
              >← Comanda anterior</button>
              <button
                style="margin-left: 1rem;"
                type="button"
                class="btn btn-sm btn-outline"
                v-if="comandasMultiples.indiceActual < comandasMultiples.lotes.length - 1"
                @click="comandasMultiples.indiceActual++"
              >Siguiente comanda →</button>
              <button type="button" class="btn btn-sm btn-ghost" style="margin-top: 0.7rem;" @click="cambiarCantidadComandas">Cambiar cantidad</button>
            </div>
          </div>
        </div>

          <div class="field" style="grid-column: 1 / -1;">
            <div
              v-if="tipoComanda === 'multiple' && comandasMultiples.confirmada && !comandasMultiples.editandoCantidad"
              class="lote-nav"
              style="margin-bottom: 0.5rem;"
            >
              <span>Observaciones de la comanda <strong>{{ comandasMultiples.indiceActual + 1 }}/{{ comandasMultiples.lotes.length }}</strong></span>
            </div>

            <label for="obs">Observaciones</label>
            <input type="text" id="obs" name="obs" v-model="datosActivos.obs" placeholder="Detalle u observaciones" @keyup.enter="irCampoSiguiente">
            <div class="fecha-dm">
              <input
                type="number"
                id="fecha-dia"
                name="fecha-dia"
                min="1"
                max="31"
                v-model="datosActivos.diaFecha"
                placeholder="Día"
                @keyup.enter="irCampoSiguiente"
              >
              <span class="separador-fecha">/</span>
              <input
                type="number"
                id="fecha-mes"
                name="fecha-mes"
                min="1"
                max="12"
                v-model="datosActivos.mesFecha"
                placeholder="Mes"
                @keyup.enter="irCampoSiguiente"
              >
            </div>

            <input type="text" id="ordencompra" name="ordencompra" v-model="datosActivos.ordenCompra"  placeholder="N° de orden de compra" @keyup.enter="irCampoSiguiente">
          </div>

<template v-for="(fila, index) in filasActivas" :key="fila.id">
  <div class="field">
    <span class="numfila">FILA {{ index + 1 }}</span>
    <label :for="'codp-' + fila.id">Código de producto</label>
    <input
      type="text"
      :id="'codp-' + fila.id"
      v-model="fila.codigoProducto"
      @blur="buscarProductoFila(fila)"
      @keyup.enter="(e) => { buscarProductoFila(fila); irCampoSiguiente(e) }"
    >
    <p v-if="fila.error" class="state-msg" style="color: var(--danger);">{{ fila.error }}</p>
  </div>
  <div class="field" style="margin-top: 1.68rem;">
    <label :for="'cantidad-' + fila.id">Cantidad</label>
    <input type="number" :id="'cantidad-' + fila.id" v-model="fila.cantidad" @keyup.enter="(e) => manejarEnterCantidad(fila, e)">
    <button
      v-if="filasActivas.length > 1"
      type="button"
      class="btn btn-sm btn-ghost"
      @click="quitarFila(fila.id)"
    >Quitar fila</button>
  </div>
</template>

<div class="field" style="grid-column: 1 / -1;" v-if="filasActivas.length < 6">
  <button type="button" class="btn btn-sm btn-outline" @click="agregarFila">+ Agregar producto</button>
</div>
        </form>
        <p v-if="clienteInfo.buscando" class="state-msg" style="padding: 0.5rem 0;">Buscando cliente…</p>
        <p v-if="clienteInfo.error" class="alert alert-danger" 
        style="color: var(--danger); padding: 0.5rem 0; margin-top: 2%; padding-left: 1rem; width: 45%; margin-bottom: 1%;">
        {{ clienteInfo.error }}
        </p>
        <div class="form-submit" style="display: flex; gap: 0.75rem;">
          <button class="btn btn-primary" type="button" @click="generarVistaPrevia" style="width: 100%;">Vista previa</button>
        </div>
        <div class="form-submit">
          <button class="btn btn-outline" id="limpiar" type="button" @click="limpiarComanda" style="width: 100%;">Limpiar comanda</button>
        </div>
      </div>
  </div>

    <div class="vp">
      <h2 class="card-title vp-title no-print">Vista previa</h2>
      <button class="btn btn-primary btn-imprimir no-print" type="button" @click="imprimir">Imprimir (original + duplicado)</button>

      <div class="impresion" id="impresion">
        <p v-if="!vistaGenerada" class="placeholder">
          Completá el formulario y presioná "Vista previa" para ver acá el original y el duplicado.
        </p>

        <template v-if="vistaGenerada">
          <template v-for="grupo in gruposImpresion" :key="grupo.posicion ?? 'unica'">
            <div
              v-for="(copia, index) in copias"
              :key="index"
              class="hoja"
            >
              <div class="hoja-header">
                <div class="logo">
                  <img style="width: 50%;" src="@/assets/logopsf.png" alt="LogoPSF"/>
                </div>
                <div class="titulo">
                  <h2 class="titulo-orden">ORDEN DE PRODUCCIÓN</h2>
                  <p class="numero-orden">Número: {{ comanda.numero || '0' }}</p>
                  <p v-if="grupo.total" class="numero-orden">Comanda {{ grupo.posicion }}/{{ grupo.total }}</p>
                  <p class="fecha-orden">{{ fechaHoy }}</p>
                </div>
              </div>

              <div class="hoja-datos">
                <div class="cliente-etiqueta-obs">
                  <div class="fila">
                    <span class="etq">CLIENTE:</span> {{ comanda.codigoCliente || '0' }}
                    <span v-if="comanda.razonSocial"> — {{ comanda.razonSocial }}</span>
                    <span class="stock" v-if="!comanda.codigoCliente">STOCK</span>
                  </div>
                  <div class="fila"><span class="etq">ETIQUETA:</span> {{ comanda.etiqueta || '0' }}</div>   
                  <div class="fila"><span class="etq">OBS.:</span>{{ grupo.obs || '0' }} <span class="etq">|</span>{{ fechaCorta(grupo.diaFecha, grupo.mesFecha) || '0' }} <span class="etq">| OC</span> {{ grupo.ordenCompra || '0' }}</div>                   
                </div>
                <div class="orden-vendedor">
                  <div class="fila derecha" style="margin-right: 4.4rem;"><span class="etq">N° DE ORDEN:</span></div>  
                  <div class="fila derecha"><span class="etq">VENDEDOR:</span> {{ comanda.vendedor || '0' }}</div>
                </div>
                </div>

              <table class="tabla-orden">
                <thead>
                  <tr>
                    <th>CODIGO</th>
                    <th style="font-size: 13px;">CANTIDAD DE<br>ROLLOS</th>
                    <th>MEDIDA</th>
                    <th>TIPO</th>
                    <th>PESO</th>
                    <th>NOMBRE<br>OPERARIO</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="fila in grupo.filas" :key="fila.id">
                    <td>{{ fila.codigoProducto || '0' }}</td>
                    <td class="cantidad">{{ fila.cantidad ?? '0' }}</td>
                    <td>{{ fila.medida || '' }}</td>
                    <td>{{ fila.tipo || '' }}</td>
                    <td>{{ pesoTotalFila(fila) ?? '' }}</td>
                    <td></td>
                  </tr>
                  <tr v-for="n in (6 - grupo.filas.length)" :key="'vacia-' + n">
                    <td>0</td>
                    <td class="cantidad">0</td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                  </tr>
                </tbody>
              </table>

              <div class="hoja-footer">
                <p class="rollos" style="margin-left: 2.7rem;"><strong>{{ cantidadTotalDe(grupo.filas) || 0 }} ROLLOS</strong></p>
                <p class="totalkg">TOTAL KG <strong>{{ pesoTotalDe(grupo.filas) ?? 0 }}</strong></p>
              </div>

              <div v-if="copia.etiqueta" class="sello-duplicado" style="background-color: white;">{{ copia.etiqueta }}</div>
            </div>
          </template>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.comanda-app {
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

html.dark .comanda-app {
  --ink: #eeeeee;
  --ink-soft: #b3b3b3;
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

img {
  width: 160px;
  height: auto;
  margin: 0 auto 1rem auto;
  margin-left: -1%;
}

td{
  height: 40px;
}

.comanda-app * {
  box-sizing: border-box;
}

/* Header */

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

.titulo-principal {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: clamp(2.1rem, 5vw, 3rem);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--ink);
  margin: 0;
  padding-bottom: 0.7rem;
  position: relative;
  display: inline-block;
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

.numero-badge {
  font-family: var(--font-body);
  font-size: 1.05rem;
  color: var(--ink);
  margin: 1rem 0 0;
}

.numero-badge strong {
  color: var(--accent-dark);
}

/* Cards */

.card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}

.card-title {
  font-family: var(--font-display);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--ink);
  margin: 0 0 1.25rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--line);
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

/* Contador panel */

.contador-panel {
  display: block;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 1rem;
  width: fit-content;
  width: 25%;
  margin: 0 auto 2.5rem;
  padding: 1.1rem 1.75rem;
}

.contador-panel .field-inline {
  flex-direction: row;
  align-items: center;
  gap: 0.6rem;
}

.contador-panel .field-inline label {
  margin: 0;
}

.contador-panel .field-inline input {
  width: 90px;
  margin: 0;
}

.contador-info {
  font-family: var(--font-body);
  font-size: 1rem;
  color: var(--ink);
  display: inline-block;
  margin-right: 0.8rem;
  justify-content: center;
}

.lote-nav {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  font-family: var(--font-body);
  font-size: 0.9rem;
  color: var(--ink);
}

.sa-comanda {
  display: inline;
}

/* Fecha día/mes */

.fecha-dm {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.fecha-dm input {
  width: auto;
  flex: 1;
}

.separador-fecha {
  font-family: var(--font-mono);
  color: var(--ink-soft);
  font-weight: 600;
}

/* Buttons */



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

/* Form */

.panel-atajos {
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

/* Layout: pantalla (formulario + calculadora) */

.pantalla {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: 2rem;
  flex-wrap: wrap;
  max-width: 1100px;
  margin: 0 auto 3rem;
  padding: 0 1.5rem;
}

.card.comanda {
  flex: 1 1 400px;
  max-width: 520px;
  padding: 1.75rem 2rem;
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

/* Vista previa / impresión */

.vp {
  max-width: 1100px;
  margin: 0 auto 4rem;
  padding: 0 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.vp-title {
  border-bottom: none;
  padding-bottom: 0;
  margin-bottom: 1.25rem;
}

.impresion {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 30px;
}

.placeholder {
  color: var(--ink-soft);
  font-style: italic;
  text-align: center;
}

.hoja {
  position: relative;
  width: 200mm;
  min-height: 230mm;
  background: #ffffff;
  padding: 2rem 2.5rem;
  box-sizing: border-box;
  font-family: var(--font-body), Arial, Helvetica, sans-serif;
  color: #000;
  box-shadow: var(--shadow);
}


.hoja-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 2px solid #000;
  padding-bottom: 10px;
  margin-bottom: 12px;
  margin-top: 5px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo-psf {
  background-color: var(--accent);
  color: #fff;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 22px;
  padding: 4px 8px;
  border-radius: 3px;
  letter-spacing: 1px;
}

.logo-texto {
  display: flex;
  flex-direction: column;
  font-size: 11px;
  line-height: 1.2;
}

.logo-texto strong {
  font-size: 12px;
}

.titulo {
  text-align: right;
}

.titulo-orden {
  margin: 0;
  font-size: 20px;
  text-align: right;
}

.numero-orden {
  margin: 2px 0 0 0;
  font-weight: bold;
  font-size: 15px;
}

.fecha-orden {
  margin: 0;
  font-size: 14px;
  color: #444;
}

.hoja-datos {
  display: grid;
  grid-template-columns: 1.7fr 1fr;
  gap: 4px 12px;
  font-size: 16px;
  margin-bottom: 14px;
}

.hoja-datos .fila {
  display: block;
}

.hoja-datos .derecha {
  text-align: left;
  margin-right: 0.5rem;
}

.cliente-etiqueta-obs{
  display: block;
  width: 100%;
  min-width: 0;
}

.orden-vendedor{
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.fila{
  margin-top: 2%;
}

.etq {
  font-weight: bold;
  font-size: 16px;
  margin-right: 4px;
}

.numfila {
  font-weight: bold;
  margin-right: 4px;
  font-size: 16px;
  font-family: var(--font-body);
}

.stock {
  margin-left: 8px;
  font-weight: bold;
}

.tabla-orden {
  width: 170mm;
  min-height: 150mm;
  border-collapse: collapse;
  font-size: 16px;
  margin-bottom: 15px;
  align-items: stretch;
  margin-left: 2.5%;  
}

.tabla-orden th,
.tabla-orden td {
  border: 1px solid #000;
  padding: 6px 4px;
  text-align: center;
}

.tabla-orden th {
  background-color: #f0f0f0;
  font-size: 13px;
}

.tabla-orden td.cantidad {
  font-size: 16px;
  font-weight: bold;
}

.hoja-footer {
  display: flex;
  justify-content: space-between;
  font-size: 20px;
  border-top: 1px solid #000;
  padding-top: 8px;
}

.totalkg{
  margin-right: 5rem;
}

.sello-duplicado {
  justify-content: end;
  text-align: center;
  font-size: 30px;
  font-weight: 800;
  letter-spacing: 2px;
  margin-top: 5px;
}

/* Responsive */

@media (max-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .card.comanda,
  .card.fcalcu {
    padding: 1.25rem;
  }

  .pantalla {
    padding: 0 1rem;
  }

  .contador-panel {
    flex-direction: column;
    align-items: stretch;
    width: auto;
    margin: 0 1rem 2rem;
  }

  .contador-panel .field-inline {
    flex-direction: column;
    align-items: stretch;
  }

  .btn {
    width: 100%;
  }
}

.pdf-render .hoja {
  box-shadow: none;
}

#impresion.pdf-render {
  gap: 0;   /* el espacio entre hojas para el PDF lo da el margen del PDF, no este gap */
}

@media (max-width: 640px) {
  .atajos-flotante {
    bottom: 0.75rem;
    right: 0.75rem;
    left: 0.75rem;
    text-align: center;
  }
}

@media (prefers-reduced-motion: reduce) {
  .comanda-app *,
  .comanda-app *::before,
  .comanda-app *::after {
    transition: none !important;
    animation: none !important;
  }
}

/* Solo se imprime el contenedor #impresion, con cada hoja en su propia página */

@media print {
  body * {
    visibility: hidden;
  }

  #impresion,
  #impresion * {
    visibility: visible;
  }

  #impresion {
    position: absolute;
    top: 0;
    left: 0;
    width: 210mm;   /* antes: 100% */
    gap: 0;
  }

  .no-print {
    display: none !important;
  }

  .hoja {
    box-shadow: none;
    page-break-after: always;
    width: 200mm;    /* antes: 100% — mismo ancho que en pantalla */
    margin: 0 auto;
  }

  .hoja:last-child {
    page-break-after: auto;
  }

  @page {
    size: custom 210mm 297mm;
    margin: 0;        /* antes: 12mm */
  }
}
</style>

