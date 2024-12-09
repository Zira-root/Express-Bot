const Canvas = require('canvas');
const { AttachmentBuilder } = require('discord.js');

const defaultTheme = {
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
    }
};

async function createLevelCard(member, levelData, nextLevelXP, settings) {
    // Créer le canvas
    const canvas = Canvas.createCanvas(800, 300);
    const ctx = canvas.getContext('2d');

    // Récupérer le thème depuis les settings ou utiliser le thème par défaut
    const theme = settings?.cardTheme || defaultTheme;
    const layout = theme.layout || {
        avatar: { x: 45, y: 45 },
        username: { x: 240, y: 100 },
        level: { x: 240, y: 150 },
        progress: { x: 240, y: 220 }
    };

    // Charger l'avatar
    const avatar = await Canvas.loadImage(member.user.displayAvatarURL({ extension: 'png', size: 256 }));

    // Dessiner le fond avec un dégradé
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, theme.background.startColor);
    gradient.addColorStop(1, theme.background.endColor);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Ajouter un effet de brillance
    const shineGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    shineGradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
    shineGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
    shineGradient.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
    ctx.fillStyle = shineGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Dessiner l'avatar avec un cercle
    ctx.save();
    ctx.beginPath();
    ctx.arc(layout.avatar.x + 80, layout.avatar.y + 80, 80, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, layout.avatar.x, layout.avatar.y, 160, 160);
    ctx.restore();

    // Ajouter un contour à l'avatar
    ctx.strokeStyle = theme.text.mainColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(layout.avatar.x + 80, layout.avatar.y + 80, 80, 0, Math.PI * 2, true);
    ctx.stroke();

    // Dessiner le nom et le tag
    ctx.font = 'bold 36px Arial';
    ctx.fillStyle = theme.text.mainColor;
    ctx.fillText(member.displayName, layout.username.x, layout.username.y);

    // Informations de niveau
    ctx.font = '28px Arial';
    ctx.fillStyle = theme.text.secondaryColor;
    ctx.fillText(`Niveau ${levelData.level}`, layout.level.x, layout.level.y);
    ctx.fillText(`XP: ${levelData.xp} / ${nextLevelXP}`, layout.level.x, layout.level.y + 40);

    // Barre de progression
    const progressWidth = 500;
    const progressHeight = 30;
    const progressX = layout.progress.x;
    const progressY = layout.progress.y;
    
    // Fond de la barre
    ctx.fillStyle = theme.progressBar.backgroundColor;
    roundRect(ctx, progressX, progressY, progressWidth, progressHeight, 15);
    ctx.fill();

    // Progression
    const progress = Math.min(levelData.xp / nextLevelXP, 1);
    const progressFillWidth = progressWidth * progress;
    
    const progressGradient = ctx.createLinearGradient(progressX, 0, progressX + progressWidth, 0);
    progressGradient.addColorStop(0, theme.progressBar.startColor);
    progressGradient.addColorStop(1, theme.progressBar.endColor);
    
    ctx.fillStyle = progressGradient;
    roundRect(ctx, progressX, progressY, progressFillWidth, progressHeight, 15);
    ctx.fill();

    // Pourcentage
    const percentage = Math.floor(progress * 100);
    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = theme.text.mainColor;
    ctx.textAlign = 'center';
    ctx.fillText(`${percentage}%`, progressX + (progressWidth / 2), progressY + 22);

    // Créer l'attachment
    return new AttachmentBuilder(canvas.toBuffer(), { name: 'level-card.png' });
}

function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

module.exports = { createLevelCard };