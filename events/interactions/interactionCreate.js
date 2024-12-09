const { Events } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    description: 'Gère les interactions des commandes.',
    async execute(interaction) {
        try {
            // Gérer les commandes slash
            if (interaction.isChatInputCommand()) {
                const command = interaction.client.commands.get(interaction.commandName);

                if (!command) {
                    console.error(`Aucune commande ${interaction.commandName} n'a été trouvée.`);
                    return;
                }

                await command.execute(interaction);
            }
            
            // Gérer les réactions
            if (interaction.isMessageComponent()) {
                const command = interaction.client.commands.get(interaction.customId);
                if (command) {
                    await command.execute(interaction);
                }
            }

        } catch (error) {
            console.error(`Erreur lors de l'interaction:`, error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ 
                    content: 'Une erreur est survenue!', 
                    ephemeral: true 
                });
            } else {
                await interaction.reply({ 
                    content: 'Une erreur est survenue!', 
                    ephemeral: true 
                });
            }
        }
    },
};