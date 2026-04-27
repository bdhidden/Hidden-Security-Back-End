require("dotenv").config()
const auth = require("./config/firebase")

const makeEnterprise = async (uid) => {
    try {
        // Preservar claims existentes y agregar isEnterprise
        const user = await auth.getUser(uid);
        const existingClaims = user.customClaims || {};

        await auth.setCustomUserClaims(uid, { 
            ...existingClaims,
            isEnterprise: true 
        });

        console.log(`✅ Usuario ${uid} ahora tiene perfil Enterprise`);
    } catch (error) {
        console.error("Error seteando claim enterprise! 🔴", error);
    }
}

makeEnterprise(process.env.ENTERPRISE_USER);