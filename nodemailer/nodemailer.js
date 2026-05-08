require("dotenv").config()
const express = require("express")
const nodemailer = require("nodemailer")

const mailRouter = express.Router()

const esProduccion = (process.env.NODE_ENV === 'production');

// Contact
mailRouter.post("/send-email", async (req, res) => {
    const { name, surname, email, tel, text } = req.body
    
    if(!name || !surname || !email || !tel || !text){
        return res.status(400).json({ message: "All required fields must be filled! 🔴" })
    }

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_FROM,
            pass: process.env.PASS_EMAIL
        }
    })

    const mailOptions = {
        from: email,
        to: process.env.EMAIL_TO, // A dónde llega el Mail
        subject: `Nueva Consulta De Curso.`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;900&display=swap" rel="stylesheet">
                <style>
                    /* Intento de forzar estilos en clientes que permiten <style> */
                    a { text-decoration: none !important; color: #ffffff !important; }
                    .no-link a { color: #ffffff !important; text-decoration: none !important; }
                </style>
            </head>
            <body style="margin: 0; padding: 0; background-color: #000000; font-family: 'Montserrat', Helvetica, Arial, sans-serif;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #000000; padding: 40px 10px;">
                    <tr>
                        <td align="center">
                            <!-- Card Container -->
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #000000; border: 1px solid #ccff00; border-radius: 0px; overflow: hidden;">
                                
                                <!-- Header -->
                                <tr>
                                    <td style="background-color: #ccff00; padding: 8px 20px;">
                                        <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                            <tr>
                                                <td>
                                                    <span style="font-family: monospace; font-size: 11px; color: #000000; font-weight: 900; letter-spacing: 2px; text-transform: uppercase;">
                                                        HIDDEN_SECURITY://INCOMING_CONTACT
                                                    </span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>

                                <!-- Main Content -->
                                <tr>
                                    <td style="padding: 50px 40px;">
                                        <div style="display: inline-block; background-color: #000000; border: 1px solid #ccff00; color: #ccff00; padding: 5px 12px; font-size: 10px; font-weight: 900; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 30px; font-family: 'Montserrat', sans-serif;">
                                            NIVEL DE ACCESO: ADMINISTRADOR
                                        </div>

                                        <h1 style="margin: 0 0 10px 0; color: #ffffff; font-family: 'Montserrat', sans-serif; font-size: 32px; font-weight: 900; letter-spacing: -1.5px; text-transform: uppercase;">
                                            NUEVA <span style="color: #ccff00;">CONSULTA</span>
                                        </h1>
                                        
                                        <!-- Data Table -->
                                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 40px;">
                                            <tr>
                                                <td style="padding: 18px 0; border-bottom: 1px solid #333333; color: #ccff00; font-family: monospace; font-size: 11px; font-weight: bold;">[CLIENTE_NAME]</td>
                                                <td style="padding: 18px 0; border-bottom: 1px solid #333333; color: #ffffff; font-family: 'Montserrat', sans-serif; font-size: 16px; font-weight: 700; text-align: right; text-transform: uppercase;">
                                                    ${name} ${surname}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 18px 0; border-bottom: 1px solid #333333; color: #ccff00; font-family: monospace; font-size: 11px; font-weight: bold;">[EMAIL_IDENTITY]</td>
                                                <td style="padding: 18px 0; border-bottom: 1px solid #333333; text-align: right;">
                                                    <a href="#" style="color: #ffffff !important; text-decoration: none !important; font-family: 'Montserrat', sans-serif; font-size: 15px; pointer-events: none;">
                                                        ${email}
                                                    </a>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 18px 0; border-bottom: 1px solid #333333; color: #ccff00; font-family: monospace; font-size: 11px; font-weight: bold;">[PHONE_CONTACT]</td>
                                                <td style="padding: 18px 0; border-bottom: 1px solid #333333; text-align: right;">
                                                    <a href="#" style="color: #ffffff !important; text-decoration: none !important; font-family: 'Montserrat', sans-serif; font-size: 15px; pointer-events: none;">
                                                        ${tel || 'NULL'}
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>

                                        <!-- Message Area -->
                                        <div style="margin-top: 10px;">
                                            <div style="color: #ccff00; font-family: monospace; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 15px;">> EXTRAER_MENSAJE:</div>
                                            <div style="background-color: #000000; padding: 25px; border: 1px solid #333333; color: #ffffff; font-family: 'Montserrat', sans-serif; font-size: 14px; line-height: 1.8; border-left: 4px solid #ccff00;">
                                                ${text}
                                            </div>
                                        </div>
                                    </td>
                                </tr>

                                <!-- Footer -->
                                <tr>
                                    <td style="background-color: #000000; padding: 40px; text-align: center; border-top: 1px solid #333333;">
                                        <div style="color: #ffffff; font-family: 'Montserrat', sans-serif; font-size: 14px; font-weight: 900; letter-spacing: 5px; text-transform: uppercase; margin-bottom: 10px;">
                                            HIDDEN <span style="color: #ccff00;">SECURITY</span>
                                        </div>
                                        <div style="color: #666666; font-family: 'Montserrat', sans-serif; font-size: 9px; text-transform: uppercase; letter-spacing: 2px;">
                                            © 2026 POWERED BY DEEPDEV STUDIO — NO LINKS ALLOWED
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
            `
    }
    try {
        await transporter.sendMail(mailOptions)
        res.status(200).json({ success: true, message: 'Correo enviado con éxito' })
    } catch (error) {
        console.error(esProduccion ? `Internal error setting up mail transporter! 🔴` : `Internal error setting up mail transporter! 🔴 ${error}`);
        res.status(500).send({ message: `Internal error setting up mail transporter! 🔴 ${error}` })
    }
})

// Ticket Compra
mailRouter.post("/course-order-confirmation", async (req, res) => {
    const { name, items, totalPrice, email, couponCode, discount } = req.body;
    // items: array de planIds ["starter", "voucher"]
    // discount: número (ej: 20 = 20%)

    if (!name || !items || !totalPrice || !email) {
        return res.status(400).json({ message: "Faltan campos requeridos 🔴" });
    }

    const PLAN_INFO = {
        starter:  { label: "STARTER",       desc: "Acceso completo · Material descargable · Certificado de cursada",       price: 80000  },
        pro:      { label: "PRO",            desc: "Voucher de examen · Acceso a laboratorios · Soporte prioritario",       price: 250000 },
        elite:    { label: "ELITE",          desc: "Re-intento · Mentorship 1-to-1 · Acceso a Red de Empleo",               price: 350000 },
        voucher:  { label: "VOUCHER EXAMEN", desc: "Derecho a examen final · Certificación oficial · Validez internacional", price: 180000 },
        b2b_seis: { label: "B2B · 6 MESES",  desc: "Base de perfiles · Filtros por habilidades · 3 Búsquedas activas",     price: 400000 },
        b2b_doce: { label: "B2B · 12 MESES", desc: "Publicaciones ilimitadas · Soporte dedicado 24/7",                      price: 700000 },
    };

    const itemsRows = items.map(id => {
        const plan = PLAN_INFO[id];
        if (!plan) return '';
        return `
            <tr>
                <td style="padding: 14px 0; border-bottom: 1px solid rgba(255,255,255,0.06);">
                    <div style="color: #ccff00; font-family: monospace; font-size: 10px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 4px;">
                        ${plan.label}
                    </div>
                    <div style="color: #94a3b8; font-family: 'Montserrat', sans-serif; font-size: 11px; line-height: 1.5;">
                        ${plan.desc}
                    </div>
                </td>
                <td style="padding: 14px 0; border-bottom: 1px solid rgba(255,255,255,0.06); color: #ffffff; font-family: 'Montserrat', sans-serif; font-size: 13px; font-weight: 700; text-align: right; white-space: nowrap; vertical-align: top;">
                    ARS $${plan.price.toLocaleString('es-AR')}
                </td>
            </tr>
        `;
    }).join('');

    const couponRow = (couponCode && discount) ? `
        <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.06); color: #94a3b8; font-family: monospace; font-size: 10px; letter-spacing: 1px;">
                CUPÓN APLICADO · ${couponCode.toUpperCase()}
            </td>
            <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.06); color: #22c55e; font-family: 'Montserrat', sans-serif; font-size: 13px; font-weight: 700; text-align: right;">
                -${discount}%
            </td>
        </tr>
    ` : '';

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_FROM,
            pass: process.env.PASS_EMAIL
        }
    });

    const mailOptions = {
        from:    process.env.EMAIL_FROM,
        to:      email,
        subject: `Confirmación de acceso — Hidden Security`,
        html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap" rel="stylesheet">
        </head>
        <body style="margin:0; padding:0; font-family:'Montserrat',Helvetica,Arial,sans-serif; -webkit-text-size-adjust:100%;">

            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="padding:40px 16px;">
                <tr>
                    <td align="center">
                        <table width="100%" border="0" cellspacing="0" cellpadding="0"
                            style="max-width:520px; background-color:#0a0a0b; border:1px solid rgba(255,255,255,0.08); overflow:hidden;">

                            <!-- BARRA TERMINAL -->
                            <tr>
                                <td style="background-color:rgba(255,255,255,0.02); padding:10px 20px; border-bottom:1px solid rgba(255,255,255,0.06);">
                                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                        <tr>
                                            <td>
                                                <span style="display:inline-block; width:9px; height:9px; border-radius:50%; background-color:#ff5f56; margin-right:4px;"></span>
                                                <span style="display:inline-block; width:9px; height:9px; border-radius:50%; background-color:#ffbd2e; margin-right:4px;"></span>
                                                <span style="display:inline-block; width:9px; height:9px; border-radius:50%; background-color:#27c93f;"></span>
                                            </td>
                                            <td style="text-align:right; font-family:monospace; font-size:10px; color:rgba(255,255,255,0.2); letter-spacing:1px;">
                                                HIDDEN_SECURITY://ACCESS_GRANTED
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>

                            <!-- ACCENT LINE -->
                            <tr>
                                <td style="background-color:#ccff00; height:3px; font-size:0; line-height:0;">&nbsp;</td>
                            </tr>

                            <!-- CONTENIDO PRINCIPAL -->
                            <tr>
                                <td style="padding:40px 32px 32px;">

                                    <!-- BADGE -->
                                    <div style="display:inline-block; background-color:rgba(204,255,0,0.08); border:1px solid rgba(204,255,0,0.25); color:#ccff00; padding:5px 12px; font-size:9px; font-weight:800; letter-spacing:2.5px; text-transform:uppercase; margin-bottom:24px; font-family:'Montserrat',sans-serif;">
                                        // ACCESO_CONCEDIDO
                                    </div>

                                    <!-- TÍTULO -->
                                    <h1 style="margin:0 0 8px 0; color:#ffffff; font-family:'Montserrat',sans-serif; font-size:22px; font-weight:900; letter-spacing:-0.5px; text-transform:uppercase; line-height:1.2;">
                                        CONFIRMACIÓN DE <span style="color:#ccff00;">COMPRA</span>
                                    </h1>
                                    <p style="margin:0 0 32px 0; color:#71717a; font-family:'Montserrat',sans-serif; font-size:13px; line-height:1.6;">
                                        Tu acceso fue habilitado en el sistema. Guardá este comprobante.
                                    </p>

                                    <!-- DATOS DEL CLIENTE -->
                                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom:28px;">
                                        <tr>
                                            <td style="padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.06); color:rgba(255,255,255,0.3); font-family:monospace; font-size:9px; font-weight:800; letter-spacing:2px; text-transform:uppercase; width:40%;">TITULAR</td>
                                            <td style="padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.06); color:#ffffff; font-family:'Montserrat',sans-serif; font-size:13px; font-weight:700; text-align:right;">${name}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.06); color:rgba(255,255,255,0.3); font-family:monospace; font-size:9px; font-weight:800; letter-spacing:2px; text-transform:uppercase;">EMAIL</td>
                                            <td style="padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.06); color:#ffffff; font-family:'Montserrat',sans-serif; font-size:13px; text-align:right;">${email}</td>
                                        </tr>
                                    </table>

                                    <!-- ITEMS -->
                                    <div style="color:rgba(255,255,255,0.3); font-family:monospace; font-size:9px; font-weight:800; letter-spacing:2px; text-transform:uppercase; margin-bottom:8px;">
                                        // PRODUCTOS_ADQUIRIDOS
                                    </div>
                                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom:4px;">
                                        ${itemsRows}
                                        ${couponRow}
                                    </table>

                                    <!-- TOTAL -->
                                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top:4px; border-top:1px solid rgba(204,255,0,0.2); padding-top:0;">
                                        <tr>
                                            <td style="padding:20px 0 0; color:#ffffff; font-family:'Montserrat',sans-serif; font-size:13px; font-weight:900; text-transform:uppercase; letter-spacing:1px;">
                                                TOTAL ABONADO
                                            </td>
                                            <td style="padding:20px 0 0; color:#ccff00; font-family:'Montserrat',sans-serif; font-size:24px; font-weight:900; text-align:right; letter-spacing:-1px;">
                                                ARS $${Number(totalPrice).toLocaleString('es-AR')}
                                            </td>
                                        </tr>
                                    </table>

                                    <!-- MENSAJE -->
                                    <div style="margin-top:32px; background-color:rgba(204,255,0,0.03); border-left:3px solid #ccff00; padding:14px 16px;">
                                        <p style="margin:0; color:#71717a; font-family:'Montserrat',sans-serif; font-size:11px; font-style:italic; line-height:1.6;">
                                            "La seguridad es un proceso, no un producto. Bienvenido a la red."
                                        </p>
                                    </div>

                                </td>
                            </tr>

                            <!-- FOOTER -->
                            <tr>
                                <td style="background-color:#000000; padding:24px 32px; text-align:center; border-top:1px solid rgba(255,255,255,0.06);">
                                    <div style="color:#ffffff; font-family:'Montserrat',sans-serif; font-size:11px; font-weight:900; letter-spacing:4px; text-transform:uppercase; margin-bottom:6px;">
                                        HIDDEN <span style="color:#ccff00;">SECURITY</span>
                                    </div>
                                    <div style="color:rgba(255,255,255,0.2); font-family:'Montserrat',sans-serif; font-size:9px; text-transform:uppercase; letter-spacing:1px;">
                                        © 2026 — Infraestructura de Aprendizaje Habilitada
                                    </div>
                                </td>
                            </tr>

                        </table>
                    </td>
                </tr>
            </table>

        </body>
        </html>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        res.status(200).json({ success: true, message: "Confirmación enviada con éxito 🟢" });
    } catch (error) {
        console.error("Error enviando confirmación de curso 🔴", error);
        res.status(500).json({ message: "Error enviando confirmación 🔴", error: error.message });
    }
});

module.exports = mailRouter