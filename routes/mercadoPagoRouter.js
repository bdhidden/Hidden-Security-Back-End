// Express y Router
const express = require("express")
const mercadoPagoRouter = express.Router()
// Mercado Pago
const { MercadoPagoConfig, Payment } =require("mercadopago")
const { v4 } = require("uuid")
// Mongo
const PaymentsMongo = require("../models/Payments")
const Coupon = require("../models/CouponSchema")

const client = new MercadoPagoConfig({ 
    accessToken: process.env.MP_ACCESS_TOKEN 
});

const paymentInstance = new Payment(client);

const esProduccion = (process.env.NODE_ENV === 'production');

/* mercadoPagoRouter.post("/mercado-pago-payments", async (req, res) => {
    const { token, issuer_id, payment_method_id, transaction_amount, installments, payer, idempotencyKey, plan } = req.body;
    
    if(!token || !payment_method_id || !transaction_amount || !installments || !payer || !idempotencyKey){
        return res.status(400).json({ message: "All fields are required to process a payments! 🔴" })
    }

    try {
        const paymentData = {
            body: {
                transaction_amount: Number(transaction_amount),
                token,
                description: "DeepDev Studio - Servicio Digital",
                installments: Number(installments),
                payment_method_id,
                issuer_id: issuer_id ? String(issuer_id) : undefined,
                payer: {
                    email: payer.email,
                    identification: payer.identification
                },
            },
            requestOptions: { 
                
                idempotencyKey: idempotencyKey 
            }
        };

        const result = await paymentInstance.create(paymentData);

        const newPayment = new PaymentsMongo({
            orderId: `ORD-${Date.now()}`, 
            client_id: payer.id_internal || "guest", 
            email: payer.email,
            plan: plan, 
            amount: Number(transaction_amount),
            mp_payment_id: String(result.id),
            status: result.status, 
            date: new Date()
        });

        await newPayment.save();

        res.status(201).json({ status: result.status, status_detail: result.status_detail, id: result.id });

    } catch (error) {
        console.error(esProduccion ? "Error MP" : "Error MP:", error.response?.data || error.message);
        res.status(500).json({ error: "Falla en el proceso de pago" });
    }
}); */

// RUTA COBRA PARA ECOMMERCE 
mercadoPagoRouter.post("/mercado-pago-payments", async (req, res) => {
    const { token, issuer_id, payment_method_id, transaction_amount, installments, payer, idempotencyKey, plan, items, couponCode } = req.body;
    
    if(!token || !payment_method_id || !transaction_amount || !installments || !payer || !idempotencyKey || !items || !Array.isArray(items)){
        return res.status(400).json({ message: "Faltan datos críticos para procesar el pago! 🔴" });
    }

    const sanitizedEmail = payer.email.toLowerCase();

    try {
        /* for (const item of items) {
            if (typeof item.cantidad !== 'number' || isNaN(item.cantidad) || item.cantidad <= 0) {
                return res.status(409).json({ message: `Cantidad no válida para el producto: ${item.nombre} 🔴` });
            }
            if (item.cantidad > item.stockMax) {
                return res.status(409).json({ message: `No es posible procesar ${item.nombre}, excede el stock disponible! 🔴` });
            }
        } */

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

        const paymentData = {
            body: {
                transaction_amount: Number(transaction_amount),
                token,
                description: "Hidden Security - Curso Digital Ciber-Seguridad",
                installments: Number(installments),
                payment_method_id,
                issuer_id: issuer_id ? String(issuer_id) : undefined,
                payer: {
                    email: sanitizedEmail,
                    identification: payer.identification
                },
            },
            requestOptions: { idempotencyKey }
        };

        const result = await paymentInstance.create(paymentData);

        if (result.status === "approved") {
            if (couponData) {
                if (couponData.type === 'single_use') {
                    await Coupon.findByIdAndUpdate(couponData._id, { 
                        $addToSet: { usedBy: sanitizedEmail },
                        isActive: false 
                    });
                } else {
                    await Coupon.findByIdAndUpdate(couponData._id, { 
                        $addToSet: { usedBy: sanitizedEmail }
                    });
                }
                console.log("Cupón utilizado o desactivado correctamente! 🟢");
            }
            await Cart.findOneAndDelete({ userEmail: sanitizedEmail });
        }

        const newPayment = new PaymentsMongo({
            orderId: `ORD-${Date.now()}`, 
            client_id: payer.id_internal || "guest", 
            email: sanitizedEmail,
            plan: plan || "Compra General", 
            amount: Number(transaction_amount),
            mp_payment_id: String(result.id),
            status: result.status, 
            date: new Date()
        });

        await newPayment.save();

        res.status(201).json({ status: result.status, status_detail: result.status_detail, id: result.id });

    } catch (error) {
        console.error(`[${new Date().toISOString()}] ERROR CRÍTICO EN PAGO/STOCK: R: MP-PYM`, error.response?.data || error.message);
        res.status(500).json({ error: "Error interno al procesar la transacción 🔴" });
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