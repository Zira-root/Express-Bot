const { REST } = require('@discordjs/rest');
const { Routes } = require('discord.js');
require('dotenv').config();

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

// Supprimer toutes les commandes globales
async function resetCommands() {
    try {
        console.log('Suppression des commandes existantes...');
        
        // Supprimer les commandes globales
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: [] });
        
        console.log('Commandes supprimées avec succès.');
    } catch (error) {
        console.error('Erreur lors de la suppression des commandes:', error);
    }
}

resetCommands();