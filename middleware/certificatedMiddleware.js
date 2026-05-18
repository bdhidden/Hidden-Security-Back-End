const auth = require("../config/firebase");

const esProduccion = process.env.NODE_ENV === "production";

const certifiedMiddleware = async (req, res, next) => {
    try {
        const token =
            req.cookies?.idToken ||
            req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({ message: "No credentials! 🔴" });
        }

        const decoded = await auth.verifyIdToken(token);

        if (decoded.userCertificated !== true) {
            return res.status(403).json({ message: "ACCESS_DENIED: CERTIFIED_ONLY 🔴" });
        }

        req.user = decoded;
        next();
    } catch (error) {
        console.error(esProduccion ? "Unauthorized! 🔴" : `Unauthorized! 🔴 ${error}`);
        return res.status(401).json({ message: "Unauthorized" });
    }
};

module.exports = certifiedMiddleware;