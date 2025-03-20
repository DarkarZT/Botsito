const { Client, GatewayIntentBits, Partials, PermissionsBitField } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

const token = process.env.TOKEN;
const guildId = process.env.GUILD_ID;


// Roles con permisos de moderación
const modRoles = ['👑 Pingüinos Supremos', '🛡️ Guardianes del Iceberg'];

const leya = 'https://www.twitch.tv/leyaa_u';


// Palabras prohibidas
const badWords = ['palabra1', 'palabra2', 'insulto'];

// Roles a crear
const rolesToCreate = [
  { name: '👑 Pingüinos Supremos', color: 'Gold' },
  { name: '🛡️ Guardianes del Iceberg', color: 'Blue' },
  { name: '❄️ VIP del Polo Norte', color: 'Grey' },
  { name: '🐧 Pingüinos Senpais', color: 'Green' },
  { name: '🏆 Pingüinos Épicos', color: 'Purple' },
  { name: '🎶 Pingüinos Rítmicos', color: 'Aqua' },
  { name: '📖 Mangas del Ártico', color: 'White' },
  { name: '🎮 Gamer-guinos', color: 'Orange' },
];

client.once('ready', async () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);

  const guild = await client.guilds.fetch(guildId);
  await guild.roles.fetch();

  // Crear roles si no existen
  rolesToCreate.forEach(async (role) => {
    if (!guild.roles.cache.find(r => r.name === role.name)) {
      await guild.roles.create({
        name: role.name,
        color: role.color,
        reason: 'Creación automática de roles',
      });
      console.log(`✔ Rol creado: ${role.name}`);
    }
  });
});

// Filtro de contenido
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // Filtro de malas palabras
  if (badWords.some(word => message.content.toLowerCase().includes(word))) {
    await message.delete();
    message.channel.send(`🚫 ${message.author} ¡No se permite lenguaje ofensivo!`);
    logAction(`${message.author.tag} intentó decir una mala palabra.`);
  }

  // Anti-spam básico: eliminar mensajes largos
  if (message.content.length > 300) {
    await message.delete();
    message.channel.send(`📛 ${message.author} ¡No se permite spam!`);
    logAction(`${message.author.tag} fue detectado por spam.`);
  }
});

// Comandos de moderación
client.on('messageCreate', async (message) => {
  if (!message.content.startsWith('!') || message.author.bot) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const command = args.shift().toLowerCase();
  const member = message.member;

  const hasModRole = modRoles.some(role => member.roles.cache.some(r => r.name === role));
  if (!hasModRole) return message.reply('❌ No tienes permisos para usar comandos de moderación.');

  if (command === 'kick') {
    const user = message.mentions.members.first();
    if (user) {
      await user.kick();
      message.channel.send(`✅ ${user.user.tag} fue expulsado.`);
      logAction(`${user.user.tag} fue expulsado por ${member.user.tag}`);
    }
  }

  if (command === 'ban') {
    const user = message.mentions.members.first();
    if (user) {
      await user.ban();
      message.channel.send(`✅ ${user.user.tag} fue baneado.`);
      logAction(`${user.user.tag} fue baneado por ${member.user.tag}`);
    }
  }

  if (command === 'purge') {
    const amount = parseInt(args[0]);
    if (!isNaN(amount)) {
      await message.channel.bulkDelete(amount);
      message.channel.send(`🧹 Se eliminaron ${amount} mensajes.`);
      logAction(`${member.user.tag} eliminó ${amount} mensajes.`);
    }
  }
  if (command === 'stream') {
    const target = args[0]?.toLowerCase();

    if (!target) return message.reply('❌ Debes indicar a quién vas a anunciar. Ej: `!stream Leya`');

    const guild = await client.guilds.fetch(guildId);
    const members = await guild.members.fetch();
    const mentions = members.filter(m => !m.user.bot).map(m => `<@${m.user.id}>`).join(' ');

    let streamMessage = `🚨 **${member.user.username} está en directo** 🚨\n`;

    if (target === 'leya') {
      streamMessage += `🔴 Mira la transmisión aquí: ${leya}`;
    } else if (target === 'darkar') {
      streamMessage += `🔴 **Darkar** está en directo:\n`;
      streamMessage += `🎮 Twitch: https://www.twitch.tv/darkartd\n`;
      streamMessage += `🎯 Kick: https://kick.com/darkartd\n`;
      streamMessage += `🎵 TikTok: https://www.tiktok.com/@darkartd`;
    } else {
      return message.reply('❌ Nombre no reconocido. Solo puedes usar `Leya` o `Darkar`.');
    }

    message.channel.send(`${mentions}\n${streamMessage}`);
    logAction(`${member.user.tag} usó el comando !stream con ${target}`);
  }



});


// Función de registro de acciones
async function logAction(text) {
  const guild = await client.guilds.fetch(guildId);
  const logChannel = guild.channels.cache.find(c => c.name === 'registro-bot');
  if (logChannel) logChannel.send(`📝 ${text}`);
}

client.login(token);
