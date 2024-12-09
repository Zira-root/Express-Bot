const { createLevelCard } = require('../../utils/levelCard');
const { getLevelSettings } = require('../../utils/database/levelSettingsManager');
const { getUserLevel } = require('../../utils/database/userLevelManager');
const { getSettings } = require('../../utils/database/guildSettingsManager');
const { checkPermission } = require('../../utils/database/permissionManager');

const defaultCardTheme = {
    name: "Défaut",
    background: {
        startColor: '#1a1a1a',
        endColor: '#2d2d2d'
    },
    progressBar: {
        startColor: '#4f46e5',
        endColor: '#7c3aed',
        backgroundColor: '#333333'
    },
    text: {
        mainColor: '#ffffff',
        secondaryColor: '#cccccc'
    },
    layout: {
        avatar: { x: 45, y: 45 },
        username: { x: 240, y: 100 },
        level: { x: 240, y: 150 },
        progress: { x: 240, y: 220 }
    }
};

module.exports = {
    name: 'level',
    description: 'Affiche ton niveau ou celui d\'un autre membre',
    usage: 'level [@membre]',
    aliases: ['lvl', 'rank', 'niveau'],
    
    async execute(message, args) {
        const hasPermission = await checkPermission(message.member, 0);
        if (!hasPermission) {
            return message.reply('Vous n\'avez pas la permission d\'utiliser cette commande.');
        }
        try {
            const targetMember = message.mentions.members.first() || message.member;
            
            const [guildSettings, levelSettings] = await Promise.all([
                getSettings(message.guild.id),
                getLevelSettings(message.guild.id)
            ]);

            if (!levelSettings.enabled) {
                return message.reply('❌ Le système de niveau n\'est pas activé sur ce serveur.');
            }

            // Vérifier et initialiser le thème si nécessaire
            if (!levelSettings.cardTheme || !levelSettings.cardTheme.layout) {
                levelSettings.cardTheme = {...defaultCardTheme};
                // Vous devrez peut-être sauvegarder ces paramètres par défaut
                // await updateLevelSettings(message.guild.id, { cardTheme: defaultCardTheme });
            }

            // Récupérer les données de niveau
            const levelData = await getUserLevel(message.guild.id, targetMember.id);
            const nextLevelXP = Math.floor(75 * Math.pow(1.4, levelData.level));

            // Générer la carte de niveau avec les paramètres complets
            const cardAttachment = await createLevelCard(
                targetMember, 
                levelData, 
                nextLevelXP, 
                {
                    ...levelSettings,
                    cardTheme: levelSettings.cardTheme || defaultCardTheme
                }
            );

            // Envoyer la carte
            await message.reply({ files: [cardAttachment] });

        } catch (error) {
            console.error('Erreur lors de l\'affichage du niveau:', error);
            await message.reply('❌ Une erreur est survenue lors de l\'affichage du niveau.');
        }
    }
};