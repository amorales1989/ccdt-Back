require('dotenv').config();
const eventsController = require('./src/controllers/eventsController');

const req = {
    body: {
        eventTitle: "Prueba Especial masiva",
        eventDate: "2026-05-01",
        description: "Esta es una prueba de envio de WhatsApp a todos los líderes, maestros y directores"
    }
};

const res = {
    status: function (code) {
        this.statusCode = code;
        return this;
    },
    json: function (data) {
        console.log("RESPONSE HTTP STATUS:", this.statusCode);
        console.log("RESPONSE JSON:", data);
    }
};

(async () => {
    try {
        console.log("🚀 Executing notifyMassiveApprovedEvent...");
        await eventsController.notifyMassiveApprovedEvent(req, res, console.error);
        console.log("✅ Function execution finished.");
        process.exit(0);
    } catch (e) {
        console.error("Error running test:", e);
        process.exit(1);
    }
})();
