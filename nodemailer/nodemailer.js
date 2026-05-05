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
/* mailRouter.post("/ticket-order", async (req, res) => {
    const { name, plan, price, email } = req.body

    if(!name || !plan || !price || !email) {
        return res.status(400).json({ message: "All Fields are required! 🔴" })
    } 
    
    const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.TICKETS_EMAIL_FROM, // ORIGEN
                pass: process.env.TICKETS_PASS_EMAIL //PASS APP
            }
    })

    const ticketsMailOptions = {
        from: process.env.TICKETS_EMAIL_FROM, // EL COMPRADOR
        to: email, // A dónde querés que llegue el Mail
        subject: `Ticket de compra DeepDev.`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;900&display=swap" rel="stylesheet">
            </head>
            <body style="margin: 0; padding: 0; background-color: #020617; font-family: 'Montserrat', Helvetica, Arial, sans-serif;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #020617; padding: 40px 10px;">
                    <tr>
                        <td align="center">
                            <!-- Card Container -->
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 500px; background-color: #0a0f1e; border: 1px solid rgba(142, 45, 226, 0.3); border-radius: 4px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
                                
                                <!-- Header Estilo Terminal -->
                                <tr>
                                    <td style="background-color: rgba(255,255,255,0.03); padding: 12px 20px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                                        <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                            <tr>
                                                <td width="50">
                                                    <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: #ff5f56; margin-right: 4px;"></span>
                                                    <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: #ffbd2e; margin-right: 4px;"></span>
                                                    <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: #27c93f;"></span>
                                                </td>
                                                <td style="font-family: monospace; font-size: 11px; color: #64748b; letter-spacing: 1px;">
                                                    HIDDEN_SECURITY://PURCHASE_CONFIRMED
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>

                                <!-- Main Content -->
                                <tr>
                                    <td style="padding: 40px 30px;">
                                        <!-- Status Badge -->
                                        <div style="display: inline-block; background-color: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); color: #4ade80; padding: 5px 12px; border-radius: 2px; font-size: 10px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 25px; font-family: 'Montserrat', sans-serif;">
                                            PAGO APROBADO
                                        </div>

                                        <h1 style="margin: 0 0 10px 0; color: #ffffff; font-family: 'Montserrat', sans-serif; font-size: 24px; font-weight: 900; letter-spacing: -1px; text-transform: uppercase;">
                                            CONFIRMACIÓN DE <span style="color: #8e2de2;">COMPRA</span>
                                        </h1>
                                        <p style="margin: 0 0 30px 0; color: #94a3b8; font-family: 'Montserrat', sans-serif; font-size: 14px; line-height: 1.5;">
                                            El acceso ha sido habilitado correctamente en el sistema.
                                        </p>

                                        <!-- Receipt Table -->
                                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 30px;">
                                            <tr>
                                                <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.05); color: #8e2de2; font-family: monospace; font-size: 11px; font-weight: bold; text-transform: uppercase;">CLIENTE</td>
                                                <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.05); color: #ffffff; font-family: 'Montserrat', sans-serif; font-size: 14px; font-weight: 700; text-align: right;">${name}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.05); color: #8e2de2; font-family: monospace; font-size: 11px; font-weight: bold; text-transform: uppercase;">EMAIL_ID</td>
                                                <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.05); color: #ffffff; font-family: 'Montserrat', sans-serif; font-size: 14px; text-align: right;">${email}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.05); color: #8e2de2; font-family: monospace; font-size: 11px; font-weight: bold; text-transform: uppercase;">PRODUCTO</td>
                                                <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.05); color: #ffffff; font-family: 'Montserrat', sans-serif; font-size: 14px; font-weight: 700; text-align: right;">${plan}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 20px 0; color: #ffffff; font-family: 'Montserrat', sans-serif; font-size: 14px; font-weight: 900; text-transform: uppercase;">TOTAL</td>
                                                <td style="padding: 20px 0; color: #4ade80; font-family: 'Montserrat', sans-serif; font-size: 22px; font-weight: 900; text-align: right;">$${price}</td>
                                            </tr>
                                        </table>

                                        <!-- Mensaje de Cierre -->
                                        <div style="background-color: rgba(142, 45, 226, 0.05); border-left: 3px solid #8e2de2; padding: 15px; color: #94a3b8; font-family: 'Montserrat', sans-serif; font-size: 12px; font-style: italic;">
                                            "La seguridad es un proceso, no un producto. Gracias por sumarte a la red."
                                        </div>
                                    </td>
                                </tr>

                                <!-- Footer -->
                                <tr>
                                    <td style="background-color: #000000; padding: 30px; text-align: center; border-top: 1px solid rgba(255,255,255,0.05);">
                                        <div style="color: #ffffff; font-family: 'Montserrat', sans-serif; font-size: 12px; font-weight: 900; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 8px;">
                                            DEEPDEV <span style="color: #8e2de2;">STUDIO</span>
                                        </div>
                                        <div style="color: #475569; font-family: 'Montserrat', sans-serif; font-size: 10px; text-transform: uppercase; letter-spacing: 1px;">
                                            © 2026 Protocolo de Encriptación Habilitado
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
        await transporter.sendMail(ticketsMailOptions)
        res.status(200).json({ success: true, message: 'Correo enviado con éxito' })
    } catch (error) {
        res.status(500).json({ message: "Error creating ticket! 🔴", error: error.message })
        console.error(esProduccion ? "Error creating ticket! 🔴" : `Error creating ticket! 🔴 ${error}`);
    }
}) */

module.exports = mailRouter