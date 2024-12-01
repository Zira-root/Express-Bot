// utils/handlers/CommandHandler.js
const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js');

class CommandHandler {
    constructor(client) {
        this.client = client;
        this.client.commands = new Collection();
    }

    loadCommands() {
        const commandsPath = path.join(process.cwd(), 'commands');
        
        // Vérifie si le dossier commands existe
        if (!fs.existsSync(commandsPath)) {
            console.error('❌ Le dossier commands n\'existe pas!');
            return;
        }
        
        const loadCommandsRecursively = (dir) => {
            const files = fs.readdirSync(dir);
            
            for (const file of files) {
                const filePath = path.join(dir, file);
                const stat = fs.statSync(filePath);
                
                if (stat.isDirectory()) {
                    loadCommandsRecursively(filePath);
                } else if (file.endsWith('.js')) {
                    try {
                        const command = require(filePath);
                        if ('name' in command && 'execute' in command) {
                            console.log(`[✓] Commande chargée: ${command.name} (${filePath})`);
                            this.client.commands.set(command.name, command);

                            // Si la commande a des aliases, les enregistrer aussi
                            if (command.aliases && Array.isArray(command.aliases)) {
                                command.aliases.forEach(alias => {
                                    this.client.commands.set(alias, command);
                                });
                            }
                        } else {
                            console.log(`[×] La commande ${filePath} est invalide (name ou execute manquant)`);
                        }
                    } catch (error) {
                        console.error(`[×] Erreur lors du chargement de ${filePath}:`, error);
                    }
                }
            }
        };

        loadCommandsRecursively(commandsPath);
        
        const totalCommands = this.client.commands.size;
        console.log('\n' + '═'.repeat(50));
        console.log(`📝 Total des commandes chargées: ${totalCommands}`);
        
        if (totalCommands === 0) {
            console.log('⚠️ Aucune commande n\'a été trouvée!');
        } else {
            console.log('✨ Liste des commandes:');
            const uniqueCommands = new Set();
            this.client.commands.forEach(cmd => uniqueCommands.add(cmd.name));
            
            uniqueCommands.forEach(cmdName => {
                const cmd = this.client.commands.get(cmdName);
                const aliases = cmd.aliases ? ` (aliases: ${cmd.aliases.join(', ')})` : '';
                console.log(`  ├─ ${cmdName}${aliases}`);
                if (cmd.description) console.log(`  │  └─ ${cmd.description}`);
            });
        }
        console.log('═'.repeat(50) + '\n');
    }
}

module.exports = CommandHandler;