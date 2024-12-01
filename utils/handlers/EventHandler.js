const fs = require('fs');
const path = require('path');

class EventHandler {
    constructor(client) {
        this.client = client;
    }

    loadEvents() {
        const eventsPath = path.join(process.cwd(), 'events');
        
        // Fonction récursive pour charger les événements dans les sous-dossiers
        const loadEventsRecursively = (dir) => {
            const files = fs.readdirSync(dir);
            
            for (const file of files) {
                const filePath = path.join(dir, file);
                const stat = fs.statSync(filePath);
                
                if (stat.isDirectory()) {
                    loadEventsRecursively(filePath);
                } else if (file.endsWith('.js')) {
                    const event = require(filePath);
                    if ('name' in event && 'execute' in event) {
                        if (event.once) {
                            this.client.once(event.name, (...args) => event.execute(...args));
                        } else {
                            this.client.on(event.name, (...args) => event.execute(...args));
                        }
                        console.log(`[✓] Événement chargé: ${event.name}`);
                    } else {
                        console.log(`[×] L'événement ${file} est invalide`);
                    }
                }
            }
        };

        loadEventsRecursively(eventsPath);
    }
}

module.exports = EventHandler;