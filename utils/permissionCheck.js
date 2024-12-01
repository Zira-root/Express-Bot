async function checkPermission(userId, commandName) {
    // Vérifier si l'utilisateur est l'owner principal
    if (userId === process.env.OWNER_ID) return true;

    // Vérifier si l'utilisateur est un owner secondaire
    const owner = await Owner.findOne({ userId });
    if (owner) return true;

    // Récupérer le niveau de permission requis pour la commande
    const commandPermission = await CommandPermission.findOne({ commandName });
    const requiredLevel = commandPermission ? commandPermission.permissionLevel : 0;

    // Vérifier le niveau de l'utilisateur (à implémenter selon votre système)
    const userLevel = await getUserLevel(userId);

    return userLevel >= requiredLevel;
}