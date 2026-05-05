// Express y Router
const express = require("express")
const contactRouter = express.Router()
// Firebase
const auth = require("../config/firebase")
// Models
const Contact = require("../models/ContactSchema")

const esProduccion = (process.env.NODE_ENV === 'production');

contactRouter.post("/contact", async (req, res) => {
    const { name, surname, email, tel, text } = req.body
    
    if(!name || !surname || !email || !tel || !text){
        return res.status(400).json({ message: "All required fields must be filled! 🔴" })
    }
    try {
        const form = { name, surname, email, tel, text}
        await Contact.create(form)

        return res.status(201).json({ message: "Contact form submitted successfully! 🟢" })
    } catch (error) {
        console.error(esProduccion ? `Error creating new contact! 🔴` : `Error creating new contact! 🔴 ${error}`);
        res.status(500).send({ message: `Error creating new contact! 🔴` })
    }
})

module.exports = contactRouter