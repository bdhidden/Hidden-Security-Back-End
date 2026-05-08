// Express y Router
const express = require("express")
const contactRouter = express.Router()
// Firebase
const auth = require("../config/firebase")
// Models
const Contact = require("../models/ContactSchema")

const esProduccion = (process.env.NODE_ENV === 'production');

contactRouter.post("/contact", async (req, res) => {
    const { name, surname, email, tel, text } = req.body;  // directo, sin .contact

    if (!name || !surname || !email || !tel || !text) {
        return res.status(400).json({ message: "All required fields must be filled! 🔴" });
    }
    try {
        const form = { name: name, surname: surname, email: email, tel: tel, text: text }
        await Contact.create(form)

        return res.status(201).json({ message: "Contact form submitted successfully! 🟢" })
    } catch (error) {
        console.error(esProduccion ? `Error creating new contact! 🔴` : `Error creating new contact! 🔴 ${error}`);
        res.status(500).send({ message: `Error creating new contact! 🔴` })
    }
})

module.exports = contactRouter