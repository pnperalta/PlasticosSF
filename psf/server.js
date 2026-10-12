import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import authRoutes from './routes/auth.js';
import usuariosRoutes from './routes/usuarios.js';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);

let productos = [
    { id: 1, nombre: 'Paleta de Padel', precio: 150 },
    { id: 2, nombre: 'Tubo de Pelotas', precio: 12 }
];

app.get('/productos', (req, res) => {
    res.json(productos);
});

app.get('/productos/:id', (req, res) => {
    const idProducto = parseInt(req.params.id);
    const producto = productos.find(i => i.id === idProducto);
    if (!producto) {
        return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json(producto);
});

app.post('/productos', (req, res) => {
    if (!req.body.nombre || !req.body.precio) {
        return res.status(400).json({ error: 'El nombre y el precio son requeridos' });
    }
    const nuevoProducto = {
        id: productos.length > 0 ? productos[productos.length - 1].id + 1 : 1,
        nombre: req.body.nombre,
        precio: parseFloat(req.body.precio)
    };
    productos.push(nuevoProducto);
    res.status(201).json(nuevoProducto);
});

app.put('/productos/:id', (req, res) => {
    const idProducto = parseInt(req.params.id);
    const producto = productos.find(i => i.id === idProducto);
    if (!producto) {
        return res.status(404).json({ error: 'Producto no encontrado para editar' });
    }
    producto.nombre = req.body.nombre || producto.nombre;
    producto.precio = req.body.precio !== undefined ? parseFloat(req.body.precio) : producto.precio;
    res.json({ mensaje: 'Producto actualizado con éxito', producto });
});

app.delete('/productos/:id', (req, res) => {
    const idProducto = parseInt(req.params.id);
    const longitudInicial = productos.length;
    productos = productos.filter(i => i.id !== idProducto);
    if (productos.length === longitudInicial) {
        return res.status(404).json({ error: 'No se encontró el producto para eliminar' });
    }
    res.json({ mensaje: `Producto con ID ${idProducto} eliminado correctamente` });
});

app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`====================================================`);
});