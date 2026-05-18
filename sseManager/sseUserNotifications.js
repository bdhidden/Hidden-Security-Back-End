// Mapa uid → Set de res (un usuario puede tener varias pestañas abiertas)
const userSseClients = new Map();

// ─── Notificar a un usuario específico ───────────────────────────────────────
const notifyUser = (userId, payload) => {
    const clients = userSseClients.get(userId);
    if (!clients || clients.size === 0) return;

    const data = JSON.stringify({
        ...payload,
        createdAt: new Date().toISOString(),
    });

    console.log(`📢 SSE user notify — uid: ${userId} — clientes: ${clients.size} — tipo: ${payload.type}`);

    clients.forEach((client) => {
        try { client.write(`data: ${data}\n\n`); }
        catch (_) { clients.delete(client); }
    });

    // Limpiar si quedó vacío
    if (clients.size === 0) userSseClients.delete(userId);
};

// ─── Handler SSE para usuarios autenticados ───────────────────────────────────
const userSseHandler = (req, res) => {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).end();

    res.setHeader("Content-Type",      "text/event-stream");
    res.setHeader("Cache-Control",     "no-cache");
    res.setHeader("Connection",        "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    // Registrar cliente
    if (!userSseClients.has(userId)) userSseClients.set(userId, new Set());
    userSseClients.get(userId).add(res);

    console.log(`🔌 SSE user conectado — uid: ${userId} — pestañas: ${userSseClients.get(userId).size}`);

    const ping = setInterval(() => {
        try { res.write(": ping\n\n"); }
        catch (_) { clearInterval(ping); userSseClients.get(userId)?.delete(res); }
    }, 25_000);

    req.on("close", () => {
        clearInterval(ping);
        userSseClients.get(userId)?.delete(res);
        if (userSseClients.get(userId)?.size === 0) userSseClients.delete(userId);
        console.log(`🔌 SSE user desconectado — uid: ${userId}`);
    });
};

module.exports = { notifyUser, userSseHandler };