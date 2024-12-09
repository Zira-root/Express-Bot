const LevelSettings = require('./schema/LevelSettings');

const defaultLevelSettings = {
    enabled: false,
    voiceEnabled: false,
    maxLevel: 0,
    color: '#5865F2',
    xpRatioMin: 25,
    xpRatioMax: 40,
    excludedRoles: [],
    excludedChannels: [],
    boostRoles: [],
    boostChannels: [],
    resetOnLeave: false,
    longMessageBonus: false,
    threadXpEnabled: false,
    rewards: [],
    cardTheme: {
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
    }
};

async function getLevelSettings(guildId) {
    try {
        let settings = await LevelSettings.findOne({ guildId });
        
        // Si aucun paramètre n'existe, créer avec les valeurs par défaut
        if (!settings) {
            settings = new LevelSettings({ 
                guildId,
                ...defaultLevelSettings
            });
            await settings.save();
        }

        // Convertir le document Mongoose en objet simple
        settings = settings.toObject();

        // S'assurer que tous les champs booléens sont bien définis
        settings.enabled = Boolean(settings.enabled);
        settings.voiceEnabled = Boolean(settings.voiceEnabled);
        settings.resetOnLeave = Boolean(settings.resetOnLeave);
        settings.longMessageBonus = Boolean(settings.longMessageBonus);
        settings.threadXpEnabled = Boolean(settings.threadXpEnabled);

        // S'assurer que les tableaux sont initialisés
        settings.excludedRoles = settings.excludedRoles || [];
        settings.excludedChannels = settings.excludedChannels || [];
        settings.rewards = settings.rewards || [];
        settings.boostRoles = settings.boostRoles || [];
        settings.boostChannels = settings.boostChannels || [];

        // S'assurer que les valeurs numériques sont correctes
        settings.maxLevel = Number(settings.maxLevel) || 0;
        settings.xpRatioMin = Number(settings.xpRatioMin) || 15;
        settings.xpRatioMax = Number(settings.xpRatioMax) || 25;

        // S'assurer que la couleur est définie
        settings.color = settings.color || '#5865F2';

        // S'assurer que le cardTheme est complet
        settings.cardTheme = {
            ...defaultLevelSettings.cardTheme,
            ...(settings.cardTheme || {})
        };
        
        return settings;
    } catch (error) {
        console.error('Erreur lors de la récupération des paramètres:', error);
        throw error;
    }
}

async function updateLevelSettings(guildId, updates) {
    try {
        const validUpdates = {
            enabled: updates.enabled,
            voiceEnabled: updates.voiceEnabled,
            maxLevel: updates.maxLevel,
            color: updates.color,
            xpRatioMin: updates.xpRatioMin,
            xpRatioMax: updates.xpRatioMax,
            levelUpChannel: updates.levelUpChannel,
            excludedRoles: updates.excludedRoles || [],
            excludedChannels: updates.excludedChannels || [],
            rewards: updates.rewards || [],
            resetOnLeave: updates.resetOnLeave,
            longMessageBonus: updates.longMessageBonus,
            threadXpEnabled: updates.threadXpEnabled,
            boostRoles: updates.boostRoles || [],
            boostChannels: updates.boostChannels || [],
            cardTheme: updates.cardTheme || defaultLevelSettings.cardTheme
        };

        // Mettre à jour les paramètres
        const settings = await LevelSettings.findOneAndUpdate(
            { guildId },
            { $set: validUpdates },
            { 
                new: true, 
                upsert: true,
                setDefaultsOnInsert: true 
            }
        );
        
        return settings;
    } catch (error) {
        console.error('Erreur lors de la mise à jour des paramètres:', error);
        throw error;
    }
}
async function addReward(guildId, rewardData) {
    try {
        const settings = await getLevelSettings(guildId);
        if (!settings) throw new Error('Paramètres non trouvés');

        if (!settings.rewards) {
            settings.rewards = [];
        }

        const newReward = {
            id: rewardData.id || Date.now().toString(),
            roleId: rewardData.roleId,
            level: rewardData.level,
            message: rewardData.message,
            channelId: rewardData.channelId
        };

        settings.rewards.push(newReward);
        
        await updateLevelSettings(guildId, settings);
        
        return newReward;
    } catch (error) {
        console.error('Erreur lors de l\'ajout d\'une récompense:', error);
        throw error;
    }
}

async function updateRewardInDB(guildId, rewardId, updatedReward) {
    try {
        const settings = await getLevelSettings(guildId);
        if (!settings) {
            throw new Error('Paramètres non trouvés');
        }

        if (!settings.rewards) {
            settings.rewards = [];
        }

        const rewardIndex = settings.rewards.findIndex(r => r.id === rewardId);
        if (rewardIndex === -1) {
            settings.rewards.push(updatedReward); 
        } else {
            settings.rewards[rewardIndex] = {
                ...settings.rewards[rewardIndex],
                ...updatedReward
            };
        }

        await LevelSettings.findOneAndUpdate(
            { guildId },
            { $set: { rewards: settings.rewards } },
            { new: true }
        );

        return updatedReward;
    } catch (error) {
        console.error('Erreur lors de la mise à jour de la récompense:', error);
        throw error;
    }
}


async function deleteRewardFromDB(guildId, rewardId) {
    try {
        const settings = await getLevelSettings(guildId);
        if (!settings) {
            throw new Error('Paramètres non trouvés');
        }

        if (!settings.rewards) {
            settings.rewards = [];
            return true;
        }

        settings.rewards = settings.rewards.filter(r => r.id !== rewardId);

        await LevelSettings.findOneAndUpdate(
            { guildId },
            { $set: { rewards: settings.rewards } },
            { new: true }
        );

        return true;
    } catch (error) {
        console.error('Erreur lors de la suppression de la récompense:', error);
        throw error;
    }
}

async function editReward(guildId, rewardId, newReward) {
    try {
        const settings = await LevelSettings.findOne({ guildId });
        if (!settings) throw new Error('Paramètres non trouvés');

        const rewardIndex = settings.rewards.findIndex(r => r.id === rewardId);
        if (rewardIndex === -1) throw new Error('Récompense non trouvée');

        settings.rewards[rewardIndex] = {
            ...settings.rewards[rewardIndex],
            ...newReward
        };

        await settings.save();
        return settings;
    } catch (error) {
        console.error('Erreur lors de la modification d\'une récompense:', error);
        throw error;
    }
}

async function deleteReward(guildId, rewardId) {
    try {
        const settings = await LevelSettings.findOne({ guildId });
        if (!settings) throw new Error('Paramètres non trouvés');

        settings.rewards = settings.rewards.filter(r => r.id !== rewardId);
        await settings.save();
        return settings;
    } catch (error) {
        console.error('Erreur lors de la suppression d\'une récompense:', error);
        throw error;
    }
}

module.exports = {
    defaultLevelSettings,
    getLevelSettings,
    updateLevelSettings,
    addReward,
    updateRewardInDB,
    deleteRewardFromDB
};