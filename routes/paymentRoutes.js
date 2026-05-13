// Express y Router
const express = require("express")
const paymentsRouter = express.Router()
// Mongo
const PaymentsMongo = require("../models/Payments")
const Coupon = require("../models/CouponSchema")

const adminMiddleware = require("../middleware/adminMiddleware")
const verifyToken = require("../middleware/authMiddleware")
const auth = require("../config/firebase")

const { notifyNewSale } = require("../sseManager/sseManajer")

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
const VALID_PLANS = ['starter', 'pro', 'elite', 'voucher', 'b2b_seis', 'b2b_doce'];

// ── FUENTE DE VERDAD DE PRECIOS (solo en el servidor) ────────────────────────
const PLAN_PRICES = {
    starter:  80000,
    pro:      250000,
    elite:    350000,
    voucher:  180000,
    b2b_seis: 400000,
    b2b_doce: 700000,
};

// Planes que incluyen vouchers automáticos al comprarse
const BUNDLED_VOUCHERS = {
    'elite': 2,  // elite incluye 2 vouchers (re-intento)
    'pro':   1,  // pro incluye 1 voucher
};

paymentsRouter.post("/test-course-payment", verifyToken, async (req, res) => {
    // transaction_amount ya NO viene del front — se calcula acá
    const { payer, idempotencyKey, items, couponCode } = req.body;

    console.log("🧪 [CURSO_SIMULACIÓN] Iniciando proceso de prueba...");

    // ── validaciones básicas ──────────────────────────────────────────────────
    if (!payer?.email || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "Faltan datos: payer.email e items son requeridos 🔴" });
    }

    const invalidItems = items.filter(i => !VALID_PLANS.includes(i));
    if (invalidItems.length > 0) {
        return res.status(400).json({ message: `Plans inválidos: ${invalidItems.join(', ')} 🔴` });
    }

    const sanitizedEmail = payer.email.trim().toLowerCase();
    const sanitizedPhone = payer.phone ? payer.phone.trim() : null;  // ✅ teléfono
    const uid            = req.user.uid;

    try {

        // ── 1. EXPANDIR ITEMS CON VOUCHERS INCLUIDOS EN EL PLAN ──────────────
        const expandedItems = [];
        for (const item of items) {
            expandedItems.push(item);
            if (BUNDLED_VOUCHERS[item]) {
                const count = BUNDLED_VOUCHERS[item];
                for (let i = 0; i < count; i++) {
                    expandedItems.push('voucher');
                }
                console.log(`✅ Plan ${item.toUpperCase()} incluye ${count} voucher(s) automático(s).`);
            }
        }

        console.log("📦 Items expandidos:", expandedItems);

        // ── 2. VALIDAR Y CONSUMIR CUPÓN ───────────────────────────────────────
        let appliedDiscount = 0;

        if (couponCode) {
            const sanitizedCode = couponCode.trim().toUpperCase();
            const coupon = await Coupon.findOne({ code: sanitizedCode, isActive: true });

            if (!coupon) {
                return res.status(404).json({ message: "Cupón no encontrado o inactivo 🔴" });
            }

            if (coupon.type === 'date_limited' && coupon.expiryDate < new Date()) {
                await Coupon.findByIdAndUpdate(coupon._id, { isActive: false });
                return res.status(400).json({ message: "El cupón expiró ⚠️" });
            }

            if (coupon.type === 'single_use' && coupon.usedBy.includes(sanitizedEmail)) {
                return res.status(400).json({ message: "Ya usaste este cupón 🔴" });
            }

            if (coupon.type === 'limited_uses') {
                if (coupon.maxUses !== null && coupon.usesCount >= coupon.maxUses) {
                    await Coupon.findByIdAndUpdate(coupon._id, { isActive: false });
                    return res.status(400).json({ message: "El cupón alcanzó su límite de usos ⚠️" });
                }
            }

            if (coupon.scope === 'plans') {
                const applies = items.some(planId => coupon.allowedPlans.includes(planId));
                if (!applies) {
                    return res.status(400).json({
                        message: `Este cupón no aplica a ninguno de los planes seleccionados 🔴`
                    });
                }
            }

            appliedDiscount = coupon.discount;
            console.log(`✅ Cupón ${sanitizedCode} válido. Descuento: ${appliedDiscount}%`);

            if (coupon.type === 'single_use') {
                await Coupon.findByIdAndUpdate(coupon._id, {
                    $addToSet: { usedBy: sanitizedEmail },
                    isActive: false
                });
            } else if (coupon.type === 'limited_uses') {
                const updated = await Coupon.findByIdAndUpdate(
                    coupon._id,
                    { $addToSet: { usedBy: sanitizedEmail }, $inc: { usesCount: 1 } },
                    { new: true }
                );
                if (updated.maxUses !== null && updated.usesCount >= updated.maxUses) {
                    await Coupon.findByIdAndUpdate(coupon._id, { isActive: false });
                    console.log(`⚠️ Cupón ${sanitizedCode} desactivado por límite de usos alcanzado.`);
                }
            } else if (coupon.type === 'date_limited') {
                await Coupon.findByIdAndUpdate(coupon._id, {
                    $addToSet: { usedBy: sanitizedEmail }
                });
            }

            console.log(`✅ Cupón ${sanitizedCode} consumido correctamente.`);
        }

        // ── 3. CALCULAR MONTO EN EL SERVIDOR ─────────────────────────────────
        // Se calcula sobre los items originales (no los bundled)
        const baseAmount  = items.reduce((acc, planId) => acc + (PLAN_PRICES[planId] || 0), 0);
        const finalAmount = appliedDiscount > 0
            ? Math.round(baseAmount * (1 - appliedDiscount / 100))
            : baseAmount;

        console.log(`💰 Monto calculado → base: $${baseAmount} | descuento: ${appliedDiscount}% | final: $${finalAmount}`);

        // ── 4. SIMULAR RESPUESTA DE MERCADO PAGO ─────────────────────────────
        const fakeMPResult = {
            id:            "fake-course-" + Math.floor(Math.random() * 1000000),
            status:        "approved",
            status_detail: "accredited"
        };

        console.log("🧪 [SIMULACIÓN] MP respondió:", fakeMPResult.status);

        if (fakeMPResult.status !== "approved") {
            return res.status(402).json({ message: "Pago rechazado en simulación", status: fakeMPResult.status });
        }

        // ── 5. SETEAR FIREBASE CUSTOM CLAIMS ─────────────────────────────────
        const userRecord    = await auth.getUser(uid);
        const currentClaims = userRecord.customClaims || {};
        const existingItems = Array.isArray(currentClaims.purchases) ? currentClaims.purchases : [];

        const nonVoucherExisting = existingItems.filter(i => i !== 'voucher');
        const nonVoucherNew      = expandedItems.filter(i => i !== 'voucher');
        const voucherCount       = existingItems.filter(i => i === 'voucher').length
                                 + expandedItems.filter(i => i === 'voucher').length;

        const updatedPurchases = [
            ...new Set([...nonVoucherExisting, ...nonVoucherNew]),
            ...Array(voucherCount).fill('voucher')
        ];

        await auth.setCustomUserClaims(uid, {
            ...currentClaims,
            purchases: updatedPurchases
        });

        console.log(`✅ Firebase claims seteadas para ${uid}:`, updatedPurchases);

        // ── 6. GUARDAR PAGO EN DB ─────────────────────────────────────────────
        const nuevoPago = new PaymentsMongo({
            orderId:       idempotencyKey || `TEST-COURSE-${Date.now()}`,
            client_id:     uid,
            email:         sanitizedEmail,
            phone:         sanitizedPhone,               // ✅ teléfono guardado
            plan:          items.join('+'),
            amount:        finalAmount,                  // ✅ calculado en backend
            mp_payment_id: fakeMPResult.id,
            status:        fakeMPResult.status,
            couponUsed:    couponCode ? couponCode.toUpperCase() : null,
            discount:      appliedDiscount,
            date:          new Date()
        });

        await nuevoPago.save();
        notifyNewSale(nuevoPago);
        console.log("✅ Pago guardado en DB.");

        // ── 7. RESPUESTA 
        return res.status(200).json({
            message:   "Simulación de curso completada con éxito 🟢",
            mp_status: fakeMPResult.status,
            mp_id:     fakeMPResult.id,
            purchases: updatedPurchases,
            discount:  appliedDiscount > 0 ? `${appliedDiscount}%` : null,
            amount:    finalAmount,                     
        });

    } catch (error) {
        console.error("❌ [CURSO_SIMULACIÓN ERROR]:", error.message);
        return res.status(500).json({ error: "Error en la simulación de curso", details: error.message });
    }
});

paymentsRouter.patch("/api/payments/:id/checked", adminMiddleware, async (req, res) => {
    await PaymentsMongo.findByIdAndUpdate(req.params.id, { checked: req.body.checked });
    res.json({ ok: true });
});

module.exports = paymentsRouter