const { updateCommandPermission } = require('../../utils/database/permissionManager');

module.exports = {
    name: 'setpermission',
    description: 'Définir le niveau de permission d\'une commande',
    usage: '<commande> <niveau>',
    async execute(message, args) {
        // Vérifier si l'utilisateur est admin
        if (!message.member.permissions.has('ADMINISTRATOR')) {
            return message.reply('Vous n\'avez pas la permission d\'utiliser cette commande.');
        }

        // Vérifier les arguments
        if (args.length < 2) {
            return message.reply(`Utilisation: ${message.prefix}setpermission <commande> <niveau (0-2)>`);
        }

        const commandName = args[0].toLowerCase();
        const permissionLevel = parseInt(args[1]);

        // Vérifier si le niveau est valide
        if (isNaN(permissionLevel) || permissionLevel < 0 || permissionLevel > 2) {
            return message.reply('Le niveau de permission doit être entre 0 et 2.\n0: Public\n1: Level 1\n2: Level 2');
        }

        try {
            // Vérifier si la commande existe
            if (!message.client.commands.has(commandName)) {
                return message.reply(`La commande ${commandName} n'existe pas.`);
            }

            // Sauvegarder la nouvelle permission dans la base de données
            await updateCommandPermission(commandName, permissionLevel);

            return message.reply(`Permission de la commande ${commandName} mise à jour au niveau ${permissionLevel}`);
        } catch (error) {
            console.error('Erreur lors de la mise à jour de la permission:', error);
            return message.reply('Une erreur est survenue lors de la mise à jour de la permission.');
        }
    },
};