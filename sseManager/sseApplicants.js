// Mapa uid (empresa) → Set de res
// Igual que sseUserNotifications — cada empresa solo recibe sus propias postulaciones
const applicantSseClients = new Map();

// ─── Notificar nueva postulación a la empresa dueña de la vacante ─────────────
const notifyNewApplicant = (vacancyId, vacancyTitle, userId, applicantName = "", companyUid) => {
    if (!companyUid) return;

    const clients = applicantSseClients.get(companyUid);
    if (!clients || clients.size === 0) return;

    const data = JSON.stringify({
        vacancyId,
        vacancyTitle,
        userId,
        applicantName,
        createdAt: new Date().toISOString(),
    });

    clients.forEach((client) => {
        try { client.write(`data: ${data}\n\n`); }
        catch (_) { clients.delete(client); }
    });

    if (clients.size === 0) applicantSseClients.delete(companyUid);
};

// ─── Handler SSE para empresas autenticadas ───────────────────────────────────
const applicantSseHandler = (req, res) => {
    // req.user es seteado por enterpriseMiddleware antes de llegar acá
    const companyUid = req.user?.uid;
    if (!companyUid) return res.status(401).end();

    res.setHeader("Content-Type",      "text/event-stream");
    res.setHeader("Cache-Control",     "no-cache");
    res.setHeader("Connection",        "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    if (!applicantSseClients.has(companyUid)) applicantSseClients.set(companyUid, new Set());
    applicantSseClients.get(companyUid).add(res);

    const ping = setInterval(() => {
        try { res.write(": ping\n\n"); }
        catch (_) { clearInterval(ping); applicantSseClients.get(companyUid)?.delete(res); }
    }, 25_000);

    req.on("close", () => {
        clearInterval(ping);
        applicantSseClients.get(companyUid)?.delete(res);
        if (applicantSseClients.get(companyUid)?.size === 0) applicantSseClients.delete(companyUid);
    });
};

module.exports = { notifyNewApplicant, applicantSseHandler };