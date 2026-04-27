// Express y Router
const express = require("express")
const paymentsRouter = express.Router()
// Mongo
const PaymentsMongo = require("../models/Payments")
const Product = require("../models/productModel")
const Cart = require("../models/CartSchema")
const Coupon = require("../models/CouponSchema")

const adminMiddleware = require("../middleware/adminMiddleware")

const esProduccion = (process.env.NODE_ENV === 'production');

paymentsRouter.post("/tickets", async (req, res) => {
    const { email } = req.body
    
    if(!email){
        return res.status(400).json({ message: "All fields are required! 🔴" })
    }
    try {
        const payments = await PaymentsMongo.find({ email: email })
        if(!payments){
            return res.status(404).json({ message: "Cannot find availiable tickets! 🔴" })
        }
        return res.status(200).json(payments)
    } catch (error) {
        console.error(esProduccion ? "Error gettings tickets! 🔴" : "Error getting tickets!", error)
        res.status(500).json({ message: "Error gettings tickets! 🔴" })
    }
})

paymentsRouter.get("/all-tickets", adminMiddleware, async (req, res) => {
    try {
        // Buscamos todos los registros sin filtros, ordenados por fecha (más recientes primero)
        const allPayments = await PaymentsMongo.find().sort({ createdAt: -1 });

        if (!allPayments || allPayments.length === 0) {
            return res.status(404).json({ message: "No sales records found! 🔴" });
        }
        
        return res.status(200).json(allPayments);
    } catch (error) {
        console.error(esProduccion ? "Error fetching all tickets! 🔴" : "Error fetching all tickets!", error);
        res.status(500).json({ message: "Internal Server Error 🔴" });
    }
});

// TEST REAL PAYMENT
/* paymentsRouter.post("/test-payment-complete", async (req, res) => {
    const { transaction_amount, payer, idempotencyKey, items, couponCode } = req.body;

    console.log("🧪 [SIMULACIÓN] Iniciando proceso completo de prueba...");

    if (!transaction_amount || !payer || !items || !Array.isArray(items)) {
        return res.status(400).json({ message: "Faltan datos para simular el proceso! 🔴" });
    }

    const sanitizedEmail = payer.email?.toLowerCase() || "test@email.com";

    try {
        for (const item of items) {
            if (typeof item.cantidad !== 'number' || isNaN(item.cantidad) || item.cantidad <= 0) {
                return res.status(409).json({ message: `Cantidad inválida: ${item.nombre} 🔴` });
            }
            if (item.cantidad > item.stockMax) {
                return res.status(409).json({ message: `Stock insuficiente para simulación: ${item.nombre} 🔴` });
            }
        }
        let couponData = null;
        if (couponCode) {
            const sanitizedCode = couponCode.toUpperCase().trim();
            const coupon = await Coupon.findOne({ code: sanitizedCode, isActive: true });
            if (!coupon) {
                return res.status(404).json({ message: "El cupón enviado no existe o ya no está activo 🔴" });
            }
            if (coupon.type === 'date_limited' && coupon.expiryDate < new Date()) {
                await Coupon.findByIdAndUpdate(coupon._id, { isActive: false });
                return res.status(400).json({ message: "El cupón ha expirado en este momento ⚠️" });
            }
            if (coupon.type === 'single_use' && coupon.usedBy.includes(sanitizedEmail)) {
                return res.status(400).json({ message: "Este cupón ya fue utilizado por tu cuenta 🔴" });
            }
            couponData = coupon; 
            console.log(`✅ Cupón ${sanitizedCode} validado internamente.`);
        }

        const fakeMPResult = {
            id: "fake-mp-" + Math.floor(Math.random() * 1000000),
            status: "approved", 
            status_detail: "accredited"
        };

        console.log("🧪 [SIMULACIÓN] MP respondió:", fakeMPResult.status);

        if (fakeMPResult.status === "approved") {
            
            const stockOperations = items.map(item => {
                const filter = item.id !== item.productId 
                    ? { _id: item.productId, "variantes._id": item.id } 
                    : { _id: item.productId };
                
                const updatePath = item.id !== item.productId 
                    ? "variantes.$.stock" 
                    : "stock_base";

                return {
                    updateOne: {
                        filter: filter,
                        update: { $inc: { [updatePath]: -item.cantidad } }
                    }
                };
            });

            await Product.bulkWrite(stockOperations);
            console.log("✅ [SIMULACIÓN] Stock actualizado.");

            if (couponData) {
                if (couponData.type === 'single_use') {
                    await Coupon.findByIdAndUpdate(couponData._id, { 
                        $addToSet: { usedBy: sanitizedEmail },
                        isActive: false // Se desactiva porque ya se usó
                    });
                } else {
                    // Si es date_limited, solo registramos quién lo usó pero sigue activo hasta que expire
                    await Coupon.findByIdAndUpdate(couponData._id, { 
                        $addToSet: { usedBy: sanitizedEmail }
                    });
                }
                console.log("✅ [SIMULACIÓN] Cupón quemado y desactivado correctamente.");
            }

            await Cart.findOneAndDelete({ userEmail: sanitizedEmail });
            console.log("✅ [SIMULACIÓN] Carrito eliminado de DB.");
        }

        const nuevoPago = new PaymentsMongo({
            orderId: idempotencyKey || `TEST-FULL-${Date.now()}`, 
            client_id: payer.id_internal || "test-client-id", 
            email: sanitizedEmail,
            plan: "Landing Basic",
            amount: Number(transaction_amount),
            mp_payment_id: fakeMPResult.id,     
            status: fakeMPResult.status,
            date: new Date()
        });

        await nuevoPago.save();
        
        res.status(200).json({ 
            message: "Simulación completa terminada con éxito",
            mp_status: fakeMPResult.status,
            id: fakeMPResult.id,
            db_updated: fakeMPResult.status === "approved"
        });

    } catch (error) {
        console.error("❌ [SIMULACIÓN ERROR]:", error.message);
        res.status(500).json({ error: "Error en la simulación completa", details: error.message });
    }
});
 */
module.exports = paymentsRouter