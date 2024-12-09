const levelManager = require('../../utils/database/levelManager');

module.exports = {
    name: 'voiceStateUpdate',
    async execute(oldState, newState) {
        await levelManager.handleVoiceState(oldState, newState);
    }
};