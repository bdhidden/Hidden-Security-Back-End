// Express y Router
const express = require("express")
const mercadoPagoRouter = express.Router()
// Mercado Pago
const { MercadoPagoConfig, Payment } =require("mercadopago")
const { v4 } = require("uuid")
// Mongo
const PaymentsMongo = require("../models/Payments")
const Coupon = require("../models/CouponSchema")
// Firebase Admin
const verifyToken = require("../middleware/authMiddleware")

const { notifyNewSale } = require("../sseManager/sseManajer")

const client = new MercadoPagoConfig({ 
    accessToken: process.env.MP_ACCESS_TOKEN 
});

const paymentInstance = new Payment(client);

const esProduccion = (process.env.NODE_ENV === 'production');

// RUTA COBRO MP HIDDEN SECURITY
const VALID_PLANS = ['starter', 'pro', 'elite', 'voucher', 'b2b_seis', 'b2b_doce'];

const PLAN_PRICES = {
    starter:  80000,
    pro:      250000,
    elite:    350000,
    voucher:  180000,
    b2b_seis: 400000,
    b2b_doce: 700000,
};

const BUNDLED_VOUCHERS = {
    'elite': 2,  // elite incluye 2 vouchers 
    'pro':   1,  // pro incluye 1 voucher 
};

// ── RUTA DE COBRO REAL 
mercadoPagoRouter.post("/mercado-pago-payments", verifyToken, async (req, res) => {
    const { token, issuer_id, payment_method_id, installments, payer, idempotencyKey, items, couponCode } = req.body;

    if (!token || !payment_method_id || !installments || !payer?.email || !idempotencyKey || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "Faltan datos críticos para procesar el pago 🔴" });
    }

    const invalidItems = items.filter(i => !VALID_PLANS.includes(i));
    if (invalidItems.length > 0) {
        return res.status(400).json({ message: `Plans inválidos: ${invalidItems.join(', ')} 🔴` });
    }

    const sanitizedEmail = payer.email.trim().toLowerCase();
    const sanitizedPhone = payer.phone ? payer.phone.trim() : null;
    const uid = req.user.uid;

    try {

        // ── 1. EXPANDIR ITEMS CON VOUCHERS BUNDLED 
        const expandedItems = [];
        for (const item of items) {
            expandedItems.push(item);
            if (BUNDLED_VOUCHERS[item]) {
                const count = BUNDLED_VOUCHERS[item];
                for (let i = 0; i < count; i++) expandedItems.push('voucher');
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
                return res.status(404).json({ message: "El cupón enviado no existe o ya no está activo 🔴" });
            }
            if (coupon.type === 'date_limited' && coupon.expiryDate < new Date()) {
                await Coupon.findByIdAndUpdate(coupon._id, { isActive: false });
                return res.status(400).json({ message: "El cupón ha expirado ⚠️" });
            }
            if (coupon.type === 'single_use' && coupon.usedBy.includes(sanitizedEmail)) {
                return res.status(400).json({ message: "Este cupón ya fue utilizado por tu cuenta 🔴" });
            }
            if (coupon.type === 'limited_uses' && coupon.maxUses !== null && coupon.usesCount >= coupon.maxUses) {
                await Coupon.findByIdAndUpdate(coupon._id, { isActive: false });
                return res.status(400).json({ message: "El cupón alcanzó su límite de usos ⚠️" });
            }
            if (coupon.scope === 'plans') {
                const applies = items.some(planId => coupon.allowedPlans.includes(planId));
                if (!applies) {
                    return res.status(400).json({ message: "Este cupón no aplica a ninguno de los planes seleccionados 🔴" });
                }
            }

            appliedDiscount = coupon.discount;
            console.log(`✅ Cupón ${sanitizedCode} válido. Descuento: ${appliedDiscount}%`);

            // Consumir antes de cobrar — evita condiciones de carrera
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
                    console.log(`⚠️ Cupón ${sanitizedCode} desactivado por límite alcanzado.`);
                }
            } else if (coupon.type === 'date_limited') {
                await Coupon.findByIdAndUpdate(coupon._id, { $addToSet: { usedBy: sanitizedEmail } });
            }

            console.log(`✅ Cupón ${sanitizedCode} consumido.`);
        }

        // ── 3. CALCULAR MONTO EN EL SERVIDOR ─────────────────────────────────
        const baseAmount  = items.reduce((acc, planId) => acc + (PLAN_PRICES[planId] || 0), 0);
        const finalAmount = appliedDiscount > 0
            ? Math.round(baseAmount * (1 - appliedDiscount / 100))
            : baseAmount;

        console.log(`💰 Monto → base: $${baseAmount} | descuento: ${appliedDiscount}% | final: $${finalAmount}`);

        // ── 4. COBRAR CON MERCADO PAGO ────────────────────────────────────────
        const paymentData = {
            body: {
                transaction_amount: finalAmount,
                token,
                description:        `Hidden Security - ${items.join(' + ').toUpperCase()}`,
                installments:       Number(installments),
                payment_method_id,
                issuer_id:          issuer_id ? String(issuer_id) : undefined,
                payer: {
                    email:          sanitizedEmail,
                    identification: payer.identification
                },
            },
            requestOptions: { idempotencyKey }
        };

        const result = await paymentInstance.create(paymentData);
        console.log(`💳 MP respondió: ${result.status} — ${result.status_detail}`);

        if (result.status !== "approved") {
            return res.status(402).json({
                message:          "Pago no aprobado",
                mp_status:        result.status,
                mp_status_detail: result.status_detail,
            });
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
            orderId:       idempotencyKey || `COURSE-${Date.now()}`,
            client_id:     uid,
            email:         sanitizedEmail,
            phone:         sanitizedPhone,
            plan:          items.join('+'),
            amount:        finalAmount,
            mp_payment_id: String(result.id),
            status:        result.status,
            couponUsed:    couponCode ? couponCode.toUpperCase() : null,
            discount:      appliedDiscount,
            date:          new Date()
        });

        await nuevoPago.save();
        notifyNewSale(nuevoPago);
        console.log("✅ Pago guardado en DB.");

        // ── 7. RESPUESTA ──────────────────────────────────────────────────────
        return res.status(200).json({
            message:   "Pago procesado con éxito 🟢",
            mp_status: result.status,
            mp_id:     result.id,
            purchases: updatedPurchases,
            discount:  appliedDiscount > 0 ? `${appliedDiscount}%` : null,
            amount:    finalAmount,
        });

    } catch (error) {
        console.error(`[${new Date().toISOString()}] ❌ ERROR EN COBRO:`, error.response?.data || error.message);
        return res.status(500).json({ error: "Error interno al procesar el pago 🔴", details: error.message });
    }
});

// RUTA PARA RECIBIR NOTIFICACIONES DE MERCADO PAGO
mercadoPagoRouter.post("/webhooks", async (req, res) => {
    try {
        const { query, body } = req;
        const id = query["data.id"] || body?.data?.id || body?.id;
        const type = query.type || body?.type;

        // IMPORTANTE: El ID "123456" es un test de MP y no existe en sus servidores reales
        if (type === "payment" && id && id !== "123456") {
            
            // Aquí es donde fallaba por el Token
            const payment = await paymentInstance.get({ id });

            await PaymentsMongo.findOneAndUpdate(
                { mpId: id.toString() },
                { 
                    status: payment.status, 
                    statusDetail: payment.status_detail 
                }
            );
        } else if (id === "123456") {
            console.log("Simulación de prueba recibida correctamente (ID 123456)");
        }

        res.status(200).send("OK");
    } catch (error) {
        console.error(esProduccion ? "Error en Webhook 🔴" : "Error en Webhook 🔴:", error.message);
        res.status(200).send("OK"); // Mandamos 200 igual para que MP no reintente
    }
});

module.exports = mercadoPagoRouter;