const express = require('express');
const cartRouter = express.Router();
const Coupon = require("../models/CouponSchema")
const Cart = require("../models/CartSchema")
const Product = require("../models/productModel")
const mongoose = require('mongoose');   
const verifyToken = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

const esProduccion = (process.env.NODE_ENV === 'production');

// CREAR NUEVO CUPÓN
cartRouter.post("/api/coupons/create", adminMiddleware, async (req, res) => {
    const { couponData } = req.body;

    if (!couponData || typeof couponData !== 'object') {
        return res.status(400).json({ message: "Datos de cupón no proporcionados o formato inválido 🔴" });
    }

    const { code, discount, type, expiryDate } = couponData;

    if (!code || !discount || !type) {
        return res.status(400).json({ message: "Faltan campos obligatorios: code, discount y type son requeridos 🔴" });
    }

    const discountNum = Number(discount);
    if (isNaN(discountNum) || discountNum <= 0 || discountNum > 100) {
        return res.status(400).json({ message: "El descuento debe ser un número entre 1 y 100 🔴" });
    }

    const validTypes = ['single_use', 'date_limited'];
    if (!validTypes.includes(type)) {
        return res.status(400).json({ message: "Tipo de cupón inválido. Use 'single_use' o 'date_limited' 🔴" });
    }

    if (type === 'date_limited') {
        if (!expiryDate) {
            return res.status(400).json({ message: "Los cupones por fecha requieren una 'expiryDate' 🔴" });
        }
        const date = new Date(expiryDate);
        if (isNaN(date.getTime()) || date <= new Date()) {
            return res.status(400).json({ message: "La fecha de expiración debe ser una fecha válida y futura 🔴" });
        }
    }

    try {
        const sanitizedCode = code.trim().toUpperCase();
        
        const exists = await Coupon.findOne({ code: sanitizedCode });
        if (exists) {
            return res.status(409).json({ message: "El código de cupón ya existe en el sistema 🔴" });
        }

        const newCoupon = await Coupon.create({
            code: sanitizedCode,
            discount: discountNum,
            type,
            expiryDate: type === 'date_limited' ? new Date(expiryDate) : null,
            isActive: true,
            usedBy: []
        });

        res.status(201).json({ message: "Cupón creado con éxito 🟢", coupon: newCoupon });

    } catch (error) {
        console.error(`[${new Date().toISOString()}] ERROR_COUPON_CREATE:`, error);
        res.status(500).json({ message: "Error interno al procesar el cupón 🔴" });
    }
});

// VALIDAR CUPONES DESCUENTO
cartRouter.post("/api/coupons/validate", verifyToken, async (req, res) => {
    const { code, email } = req.body;

    const sanitizedCode = code?.toString().trim().toUpperCase();
    const sanitizedEmail = email?.toString().trim().toLowerCase();

    if (!sanitizedCode || !sanitizedEmail) {
        return res.status(400).json({ message: "Código y email son requeridos 🔴" });
    }
    try {
        const coupon = await Coupon.findOne({ code: sanitizedCode, isActive: true });

        if (!coupon) {
            return res.status(404).json({ message: "Cupón no encontrado o inactivo 🔴" });
        }

        if (coupon.type === 'date_limited' && coupon.expiryDate < new Date()) {
            return res.status(400).json({ message: "El cupón ha expirado ⚠️" });
        }

        if (coupon.type === 'single_use' && coupon.usedBy.includes(email)) {
            return res.status(400).json({ message: "Ya has utilizado este cupón 🔴" });
        }

        res.status(200).json({ message: "Cupón aplicado con éxito 🟢", coupon: { code: coupon.code, discount: coupon.discount } });

    } catch (error) {
        console.error(`[${new Date().toISOString()}] ERROR en validar cupón cartRouter = POST :`, error);
        res.status(500).json({ message: "Error interno al validar cupón" });
    }
});

// OBTENER CUPONES
cartRouter.get("/api/coupons/all", adminMiddleware, async (req, res) => {
    try {
        const coupons = await Coupon.find().sort({ createdAt: -1 });
        res.status(200).json(coupons);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener cupones 🔴" });
    }
});

// ELIMINAR CUPÓN
cartRouter.delete("/api/coupons/:id", adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        await Coupon.findByIdAndDelete(id);
        res.status(200).json({ message: "Cupón eliminado correctamente 🟢" });
    } catch (error) {
        res.status(500).json({ message: "Error al eliminar el cupón 🔴" });
    }
});

// CREAR - SINCRONIZAR CARRITO
cartRouter.post("/api/cart/sync", verifyToken, async (req, res) => {
    const { email, items, appliedCoupon, merge = false } = req.body; 
    console.log("CART SYN REQ BODY", req.body);
    
    console.log("CART SYNC", items[0]?.cuotas_sin_interes);
    
    const sanitizedEmail = email?.trim().toLowerCase();
    
    if (!sanitizedEmail || !Array.isArray(items)) {
        return res.status(400).json({ message: "Datos inválidos 🔴" });
    }

    try {
        let existingCart = await Cart.findOne({ userEmail: sanitizedEmail });

        if (!existingCart) {
            existingCart = new Cart({ userEmail: sanitizedEmail, items, appliedCoupon });
        } else {
            if (merge) {
                items.forEach(newItem => {
                    const idx = existingCart.items.findIndex(i => i.productId.toString() === newItem.productId.toString());
                    if (idx > -1) {
                        existingCart.items[idx].quantity += newItem.quantity;
                    } else {
                        existingCart.items.push(newItem);
                    }
                });
            } else {
                existingCart.items = items;
            }
            if (appliedCoupon) existingCart.appliedCoupon = appliedCoupon;
        }

        await existingCart.save();
        res.status(200).json({ message: "Sincronizado ✅", items: existingCart.items });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] ERROR en SYNC CART cartRouter = POST :`, error);
        res.status(500).json({ message: "Error en servidor" });
    }
});

// OBTENER CARRITO
cartRouter.get("/api/cart/:email", verifyToken, async (req, res) => {
    const { email } = req.params;

    try {
        const cart = await Cart.findOne({ userEmail: email.toLowerCase() }).populate('items.productId'); 
        
        if (!cart) {
            return res.status(200).json({ message: "Carrito no encontrado", items: [], appliedCoupon: null });
        }
        const couponToReturn = cart.appliedCoupon || null;

        const updatedItems = cart.items.map(item => {
            const realProduct = item.productId; 
            let alert = null;
            let currentQuantity = item.cantidad;

            if (!realProduct) {
                alert = "Este producto ya no está disponible";
                return { ...item._doc, stockMax: 0, alert };
            }

            if (realProduct.stock <= 0) {
                alert = "Producto agotado 🔴";
                currentQuantity = 0; 
            } else if (item.cantidad > realProduct.stock) {
                alert = `Stock reducido a ${realProduct.stock} unidades ⚠️`;
                currentQuantity = realProduct.stock;
            }

            return { 
                ...item._doc, 
                productId: realProduct._id, 
                nombre: realProduct.nombre || item.nombre,
                precio: realProduct.precio || item.precio,
                stockMax: realProduct.stock, 
                cantidad: currentQuantity,
                alert 
            };
        });

        res.status(200).json({ message: "Carrito verificado con éxito 🟢", items: updatedItems, appliedCoupon: couponToReturn });

    } catch (error) {
        console.error(`[${new Date().toISOString()}] ERROR en GET /api/cart/:email :`, error);
        res.status(500).json({ message: "Error al recuperar el carrito 🔴", error: error.message });
    }
});

// DELETE CARRITO POST CHECKOUT
cartRouter.delete("/api/cart/clear/:email", verifyToken, async (req, res) => {
    const { email } = req.params;
    try {
        if (req.user.email !== req.params.email) {
            return res.status(403).json({ message: "No tienes permiso para vaciar este carrito 🔴" });
        }
        await Cart.findOneAndDelete({ userEmail: email.toLowerCase() });
        res.status(200).json({ message: "Carrito vaciado correctamente 🟢" });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] ERROR DELETE CART:`, error);
        res.status(500).json({ message: "Error al vaciar el carrito 🔴" });
    }
});

//  CHECKOUT SUCCESS
cartRouter.post("/api/checkout/success", /* verifyToken, */ async (req, res) => {
    const { email, couponCode, items } = req.body; 
    const sanitizedEmail = email.toLowerCase();

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "No hay productos para procesar 🔴" });
    }

    try {
        const stockOperations = items.map(item => {
            if(typeof item.cantidad !== 'number' || typeof item.stockMax !== 'number'){
                return res.status(409).json({ message: "No es posible procesar productos cuyos valores no sean númericos! 🔴" })
            }
            if (isNaN(item.cantidad) || isNaN(item.stockMax)) {
                return res.status(409).json({ message: "Los valores numéricos no son válidos! 🔴" });
            }
            if(item.cantidad > item.stockMax){
                return res.status(409).json({ message: "No es posible procesar productos que excedan el stock máximo! 🔴" })
            }
            if(item.cantidad <= 0){
                return res.status(409).json({ message: "No es posible procesar productos con cantidades negativas o iguales a cero! 🔴" })
            }
            if (item.id !== item.productId) {
                return {
                    updateOne: {
                        filter: { _id: item.productId, "variantes._id": item.id },
                        update: { $inc: { "variantes.$.stock": - item.cantidad } } 
                    }
                };
            } else {
                return {
                    updateOne: {
                        filter: { _id: item.productId },
                        update: { $inc: { stock_base: - item.cantidad } } 
                    }
                };
            }
        });
        await Product.bulkWrite(stockOperations);
        if (couponCode) {
            await Coupon.findOneAndUpdate(
                { code: couponCode.toUpperCase(), type: 'single_use' },
                { $addToSet: { usedBy: sanitizedEmail } }
            );
        }
        await Cart.findOneAndDelete({ userEmail: sanitizedEmail });

        res.status(200).json({ message: "Compra procesada: Stock actualizado correctamente 🟢" });

    } catch (error) {
        console.error(`[${new Date().toISOString()}] ERROR SUCCESS PROCESS:`, error);
        res.status(500).json({ message: "Error crítico al finalizar la compra 🔴" });
    }
});

// RECHECK PRECIOS DB PROMO (CON CUOTAS)
cartRouter.post('/api/products/validate-prices', async (req, res) => {
    try {
        const { productIds } = req.body; 

        const products = await Product.find({
            $or: [
                { _id: { $in: productIds } },
                { "variantes._id": { $in: productIds } }
            ]
        }).select('precio_base en_promocion porcentaje_promo stock_base variantes cuotas_sin_interes');

        const formatted = productIds.map(id => {
            const p = products.find(prod => 
                prod._id.toString() === id || 
                prod.variantes.some(v => v._id.toString() === id)
            );

            if (!p) return null;

            let precioFinal = p.precio_base;
            const tienePromo = p.en_promocion && p.porcentaje_promo > 0;

            const varianteEncontrada = p.variantes.find(v => v._id.toString() === id);

            if (varianteEncontrada) {
                const precioConAdicional = p.precio_base + (varianteEncontrada.precio_adicional || 0);
                precioFinal = tienePromo 
                    ? precioConAdicional * (1 - p.porcentaje_promo / 100)
                    : precioConAdicional;

                return {
                    productId: id, 
                    precio: Math.round(precioFinal),
                    stockMax: varianteEncontrada.stock || 0,
                    cuotas_sin_interes: p.cuotas_sin_interes || 0 
                };
            } else {
                precioFinal = tienePromo 
                    ? p.precio_base * (1 - p.porcentaje_promo / 100)
                    : p.precio_base;

                return {
                    productId: id,
                    precio: Math.round(precioFinal),
                    stockMax: p.stock_base || 0,
                    cuotas_sin_interes: p.cuotas_sin_interes || 0
                };
            }
        }).filter(item => item !== null);
        
        res.status(200).json(formatted);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] ERROR VALIDATE PRODUCTOS - PRECIOS cartRouter: POST`, error);
        res.status(500).json({ message: "Error al validar precios" });
    }
});

module.exports = cartRouter