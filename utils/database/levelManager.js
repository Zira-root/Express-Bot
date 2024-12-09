const { EmbedBuilder } = require('discord.js');
const { getLevelSettings } = require('./levelSettingsManager');
const { getUserLevel, updateUserLevel } = require('./userLevelManager');

function getRandomCongrats() {
    const congrats = [
        '🌟 Incroyable !',
        '🎯 Bien joué !',
        '⚡ Fantastique !',
        '🔥 En feu !',
        '✨ Impressionnant !',
        '🚀 Tu déchires !',
        '💫 Extraordinaire !',
        '🌈 Magnifique !',
        '💪 Force à toi !',
        '🏆 Champion !'
    ];
    return congrats[Math.floor(Math.random() * congrats.length)];
}

class LevelManager {
    constructor() {
        this.cooldowns = new Map();
    }

    calculateXpForNextLevel(level) {
        return 75 + (level * 30); 
    }

    async handleMessage(message) {
        try {
            // Vérifications de base
            if (!message.guild || message.author.bot) return;
            
            // Récupérer les paramètres du serveur
            const settings = await getLevelSettings(message.guild.id);
            if (!settings?.enabled) return;

            // Vérifier les exclusions
            if (this.isExcluded(message, settings)) return;

            // Vérifier le cooldown
            const cooldownKey = `${message.guild.id}_${message.author.id}`;
            if (this.isOnCooldown(cooldownKey)) return;

            // Calculer l'XP gagné
            const xpGained = this.calculateXpGain(message, settings);

            // Mettre à jour le niveau
            await this.updateUserXP(message, xpGained, settings);

            // Mettre à jour le cooldown
            this.setCooldown(cooldownKey);

        } catch (error) {
            console.error('Erreur dans handleMessage:', error);
        }
    }

    isExcluded(message, settings) {
        // Vérifier les rôles exclus
        if (settings.excludedRoles.some(roleId => message.member.roles.cache.has(roleId))) {
            return true;
        }

        // Vérifier les salons exclus
        if (settings.excludedChannels.includes(message.channel.id)) {
            return true;
        }

        // Vérifier les threads si désactivés
        if (!settings.threadXpEnabled && message.channel.isThread()) {
            return true;
        }

        return false;
    }

    isOnCooldown(key) {
        const lastTime = this.cooldowns.get(key);
        if (!lastTime) return false;
        return (Date.now() - lastTime) < 1000;
    }

    setCooldown(key) {
        this.cooldowns.set(key, Date.now());
    }

    calculateXpGain(message, settings) {
        let xp = Math.floor(Math.random() * (settings.xpRatioMax - settings.xpRatioMin + 1) + settings.xpRatioMin);
        
        // Bonus pour les messages longs
        if (settings.longMessageBonus && message.content.length > 100) {
            xp *= 1.5;
            console.log('Bonus message long appliqué. Nouvel XP:', xp);
        }
    
        // Multiplicateurs des rôles
        for (const boostRole of settings.boostRoles) {
            if (message.member.roles.cache.has(boostRole.roleId)) {
                xp *= boostRole.multiplier;
                console.log(`Boost de rôle appliqué (x${boostRole.multiplier}). Nouvel XP:`, xp);
            }
        }
    
        // Multiplicateurs des salons
        const channelBoost = settings.boostChannels.find(c => c.channelId === message.channel.id);
        if (channelBoost) {
            xp *= channelBoost.multiplier;
            console.log(`Boost de salon appliqué (x${channelBoost.multiplier}). Nouvel XP:`, xp);
        }
    
        const finalXp = Math.floor(xp);
        return finalXp;
    }

    async updateUserXP(message, xpGained, settings) {
        try {
            // Récupérer le niveau actuel
            const userLevel = await getUserLevel(message.guild.id, message.author.id) || {
                xp: 0,
                level: 0
            };
    
            // Ajouter l'XP
            let newXp = userLevel.xp + xpGained;
            let newLevel = userLevel.level;
    
            // Vérifier les passages de niveau
            let leveledUp = false;
            while (newXp >= this.calculateXpForNextLevel(newLevel)) {
                newXp -= this.calculateXpForNextLevel(newLevel);
                newLevel++;
                leveledUp = true;
    
                console.log(`Passage au niveau ${newLevel}!`);
                console.log('XP restant:', newXp);
    
                // Vérifier le niveau maximum
                if (settings.maxLevel > 0 && newLevel >= settings.maxLevel) {
                    newLevel = settings.maxLevel;
                    newXp = 0; // Reset XP au max level
                    leveledUp = false;
                    console.log('Niveau maximum atteint');
                    break;
                }
            }
    
            // Mettre à jour en base
            const updateData = {
                xp: newXp,
                level: newLevel
            };
            
            await updateUserLevel(message.guild.id, message.author.id, updateData);
    
            // Gérer le passage de niveau
            if (leveledUp) {
                await this.handleLevelUp(message, settings, newLevel);
            }
    
        } catch (error) {
            console.error('Erreur dans updateUserXP:', error);
        }
    }

    async handleLevelUp(message, settings, newLevel) {
        try {
            // Calculer les stats
            const xpForNextLevel = this.calculateXpForNextLevel(newLevel);
            const rewards = settings.rewards.filter(r => r.level === newLevel);
            
            // Créer l'embed
            const embed = new EmbedBuilder()
                .setColor(settings.color)
                .setAuthor({ 
                    name: `Félicitations ${message.member.displayName} !`, 
                    iconURL: message.author.displayAvatarURL({ dynamic: true }) 
                })
                .setDescription(`
                    ${getRandomCongrats()} Tu es passé au niveau **${newLevel}** !
                    
                    📊 **Progression**
                    ┃ 📈 Niveau atteint : **${newLevel}**
                    ┗ ⭐ XP requis pour niveau ${newLevel + 1} : **${xpForNextLevel}** XP
                    
                    ${rewards.length > 0 ? `\n🎁 **Récompenses débloquées**\n${rewards.map(r => `┃ <@&${r.roleId}>`).join('\n')}` : ''}
                `)
                .setThumbnail(message.guild.iconURL({ dynamic: true }))
                .setFooter({ text: '🌟 Continue comme ça !' })
                .setTimestamp();
    
            // Déterminer le canal où envoyer le message
            const channel = settings.levelUpChannel ? 
                message.guild.channels.cache.get(settings.levelUpChannel) : 
                message.channel;
    
            // Envoyer le message avec une petite animation de confettis
            if (channel) {
                await channel.send({ 
                    content: `🎉 <@${message.author.id}>`,
                    embeds: [embed]
                });
            } else {
                await message.channel.send({ 
                    content: `🎉 <@${message.author.id}>`,
                    embeds: [embed]
                });
            }
    
            // Attribuer les récompenses
            for (const reward of rewards) {
                try {
                    await message.member.roles.add(reward.roleId);
                } catch (error) {
                    console.error(`Erreur lors de l'attribution du rôle:`, error);
                }
            }
        } catch (error) {
            console.error('Erreur dans handleLevelUp:', error);
        }
    }
}

module.exports = new LevelManager();