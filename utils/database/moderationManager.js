const { Sanction, ModerationSettings } = require('./schema/ModerationSchema');
const { EmbedBuilder } = require('discord.js');

class ModerationManager {
    constructor() {
        this.caseNumberCache = new Map();
    }

    async getNextCaseNumber(guildId) {
        if (!this.caseNumberCache.has(guildId)) {
            const lastCase = await Sanction.findOne({ guildId }).sort({ caseId: -1 });
            this.caseNumberCache.set(guildId, (lastCase?.caseId || 0) + 1);
        } else {
            this.caseNumberCache.set(guildId, this.caseNumberCache.get(guildId) + 1);
        }
        return this.caseNumberCache.get(guildId);
    }

    async createSanction(guildId, userId, moderatorId, type, reason, duration = null) {
        const caseId = await this.getNextCaseNumber(guildId);
        const expires = duration ? new Date(Date.now() + duration) : null;

        const sanction = new Sanction({
            guildId,
            userId,
            moderatorId,
            type,
            reason,
            duration,
            caseId,
            expires
        });

        await sanction.save();
        return sanction;
    }

    async getModLogChannel(guildId) {
        const settings = await ModerationSettings.findOne({ guildId });
        return settings?.modLogChannel;
    }

    createModLogEmbed(sanction, user, moderator) {
        const embed = new EmbedBuilder()
            .setColor(this.getSanctionColor(sanction.type))
            .setTitle(`Sanction #${sanction.caseId}`)
            .setDescription(`**Type:** ${sanction.type}\n**Utilisateur:** ${user.tag} (${user.id})\n**Modérateur:** ${moderator.tag}\n**Raison:** ${sanction.reason}`)
            .setTimestamp();

        if (sanction.duration) {
            embed.addFields([
                { name: 'Durée', value: this.formatDuration(sanction.duration), inline: true },
                { name: 'Expire', value: `<t:${Math.floor(sanction.expires.getTime() / 1000)}:R>`, inline: true }
            ]);
        }

        return embed;
    }

    getSanctionColor(type) {
        const colors = {
            BAN: '#FF0000',
            KICK: '#FFA500',
            MUTE: '#FFFF00',
            WARN: '#00FF00',
            UNMUTE: '#00FFFF',
            UNBAN: '#0000FF',
            UNWARN: '#FF00FF'
        };
        return colors[type] || '#FFFFFF';
    }

    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}j`;
        if (hours > 0) return `${hours}h`;
        if (minutes > 0) return `${minutes}m`;
        return `${seconds}s`;
    }

    async getUserSanctions(guildId, userId) {
        return await Sanction.find({ 
            guildId, 
            userId 
        }).sort({ timestamp: -1 });
    }

    async getModerationSettings(guildId) {
        let settings = await ModerationSettings.findOne({ guildId });
        if (!settings) {
            settings = new ModerationSettings({ guildId });
            await settings.save();
        }
        return settings;
    }

    async getAllActiveWarnings(guildId) {
        return await Sanction.find({
            guildId,
            type: 'WARN',
            active: true
        }).sort({ timestamp: -1 });
    }

    async cleanUserWarnings(guildId, userId) {
        await Sanction.deleteMany({
            guildId,
            userId,
            type: 'WARN'
        });
    }

    async getSanctionById(caseId) {
        const sanction = await Sanction.findOne({ caseId });
        return sanction;
    }
}

module.exports = new ModerationManager();