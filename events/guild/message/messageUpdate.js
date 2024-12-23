const { sendLog } = require('../../../utils/function/logs');

module.exports = {
    name: 'messageUpdate',
    description: 'Logs des messages modifiés',
    async execute(oldMessage, newMessage) {
        if (!oldMessage.guild || oldMessage.author?.bot) return;
        if (oldMessage.content === newMessage.content) return;

        await sendLog(oldMessage.guild, 'MESSAGES', {
            action: 'EDIT',
            user: oldMessage.author,
            channel: oldMessage.channel,
            oldContent: oldMessage.content,
            newContent: newMessage.content,
            id: oldMessage.id
        });
    }
};