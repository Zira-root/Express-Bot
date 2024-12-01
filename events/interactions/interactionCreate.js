const { Events } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        // Log pour debug
        console.log(`Interaction reçue: ${interaction.commandName}`);

        if (!interaction.isChatInputCommand()) return;

        const command = interaction.client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`Aucune commande ${interaction.commandName} n'a été trouvée.`);
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(`Erreur lors de l'exécution de la commande ${interaction.commandName}:`, error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'Une erreur est survenue lors de l\'exécution de cette commande!', ephemeral: true });
            } else {
                await interaction.reply({ content: 'Une erreur est survenue lors de l\'exécution de cette commande!', ephemeral: true });
            }
        }
    },
};