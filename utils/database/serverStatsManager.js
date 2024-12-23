const cron = require('node-cron');

// Collecte des stats toutes les 24 heures
cron.schedule('0 0 * * *', async () => {
    client.guilds.cache.forEach(async (guild) => {
        try {
            await collectHistoricalData(guild);
            console.log(`Stats collectées pour ${guild.name}`);
        } catch (error) {
            console.error(`Erreur lors de la collecte des stats pour ${guild.name}:`, error);
        }
    });
});