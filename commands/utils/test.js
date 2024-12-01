const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('test')
        .setDescription('Une commande de test simple')
        .setDMPermission(false) // Désactive la commande en DM
        .setDefaultMemberPermissions(null), // Permet à tout le monde de l'utiliser
        
    async execute(interaction) {
        await interaction.reply('Test réussi! 🎉');
    }
};