const mongoose = require('mongoose');

const CartSchema = new mongoose.Schema({
    userEmail: { 
        type: String, 
        required: true, 
        unique: true, 
        lowercase: true 
    },
    appliedCoupon: {
        code: { type: String, uppercase: true },
        discount: { type: Number },
        appliedAt: { type: Date }
    },
    items: [
        {
            id: { type: String, required: true },
            productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
            nombre: String,
            precio: Number,
            imagen: String,
            cantidad: { type: Number, min: 1 },
            stockMax: Number,
            cuotas_sin_interes: { type: Number, default: 0 }
        }
    ],
}, { timestamps: true });

// Cart.js
CartSchema.post('init', function(doc) {
    console.log("-----------------------------------------");
    console.log(">>> EJECUTANDO MIDDLEWARE INIT PARA:", doc.userEmail);
    
    if (doc.appliedCoupon && doc.appliedCoupon.appliedAt) {
        const veinticuatroHoras = 24 * 60 * 60 * 1000;
        const ahora = new Date().getTime();
        const aplicadoEn = new Date(doc.appliedCoupon.appliedAt).getTime();
        const transcurrido = ahora - aplicadoEn;

        console.log(`>>> Cupón detectado: ${doc.appliedCoupon.code}`);
        console.log(`>>> Segundos transcurridos: ${Math.floor(transcurrido / 1000)}s`);

        if (transcurrido > veinticuatroHoras) {
            console.log(">>> ¡EXPIRADO! Borrando de la DB...");
            doc.appliedCoupon = undefined;

            mongoose.model("Cart").updateOne(
                { _id: doc._id },
                { $unset: { appliedCoupon: "" } }
            ).then(() => console.log(">>> DB Actualizada con éxito"))
             .catch(err => console.error("Error DB:", err));
        }
    } else {
        console.log(">>> El carrito no tiene cupón o le falta la fecha.");
    }
    console.log("-----------------------------------------");
});

const Cart = mongoose.model("Cart", CartSchema);
module.exports = Cart;