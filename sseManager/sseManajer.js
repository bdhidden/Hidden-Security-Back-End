const sseClients = new Set();

const notifyNewSale = (payment) => {
    if (sseClients.size === 0) return;
    const data = JSON.stringify({
        _id:       payment._id,
        email:     payment.email,
        amount:    payment.amount,
        status:    payment.status,
        checked:   payment.checked ?? false,
        createdAt: payment.createdAt,
    });
    sseClients.forEach(client => {
        try { client.write(`data: ${data}\n\n`); }
        catch (_) { sseClients.delete(client); }
    });
};

const sseHandler = (req, res) => {
    // req.user es seteado por adminMiddleware antes de llegar acá
    const uid = req.user?.uid;
    if (!uid) return res.status(401).end();

    res.setHeader("Content-Type",      "text/event-stream");
    res.setHeader("Cache-Control",     "no-cache");
    res.setHeader("Connection",        "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const ping = setInterval(() => {
        try { res.write(": ping\n\n"); }
        catch (_) { clearInterval(ping); sseClients.delete(res); }
    }, 25_000);

    sseClients.add(res);

    req.on("close", () => {
        clearInterval(ping);
        sseClients.delete(res);
    });
};

module.exports = { notifyNewSale, sseHandler };