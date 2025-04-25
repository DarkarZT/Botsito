// ✅ Dependencias principales
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { DisTube } = require('distube');
const { YtDlpPlugin } = require("@distube/yt-dlp");
const { SpotifyPlugin } = require('@distube/spotify');
const { joinVoiceChannel } = require('@discordjs/voice');
const { default: playdl } = require("play-dl");
const { SoundCloudPlugin } = require("@distube/soundcloud");

const ytSearchApi = require('youtube-search-api');
require('dotenv').config();

// ✅ Configuración de variables de entorno
const token = process.env.TOKEN;
const guildId = process.env.GUILD_ID;
const apikey = process.env.DEEPSEEK_API_KEY
// ✅ Roles y parámetros de moderación
const modRoles = ['👑 Pingüinos Supremos', '🛡️ Guardianes del Iceberg'];
const leya = 'https://www.twitch.tv/leyaa_u';
const badWords = ['palabra1', 'palabra2', 'insulto'];

// ✅ Roles a crear automáticamente
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

// ✅ Crear el cliente de Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// ✅ Configuración de DisTube
const distube = new DisTube(client, {
  plugins: [
    new YtDlpPlugin(),
    new SpotifyPlugin(),
    new SoundCloudPlugin()
  ],
  emitNewSongOnly: true,
  nsfw: true,
  leaveOnFinish: true,
  leaveOnEmpty: true,
  leaveOnStop: true,
  searchSongs: 1,
  searchCooldown: 5,
  ytdlOptions: {
    requestOptions: {
      headers: {
        cookie: process.env.YOUTUBE_COOKIE || ""
      }
    },
    highWaterMark: 1 << 25
  },
  customFilters: {}
});

// ✅ Función para cerrar sesión del bot
function shutdownBot() {
  console.log('⏹️ Bot inactivo durante 5 minutos. Cerrando sesión...');
  client.destroy();
}
// ✅ Salida automática de canal de voz tras 5 minutos sin música
setInterval(() => {
  const guilds = client.guilds.cache;
  guilds.forEach(guild => {
    const queue = distube.getQueue(guild.id);
    if (!queue && guild.members.me.voice.channel) {
      const channel = guild.members.me.voice.channel;
      if (channel) {
        setTimeout(() => {
          const currentQueue = distube.getQueue(guild.id);
          if (!currentQueue && channel.members.size === 1) {
            guild.members.me.voice.disconnect();
            console.log(`🚪 Salí del canal de voz en ${guild.name} por inactividad.`);
          }
        }, 5 * 60 * 1000); // 5 minutos
      }
    }
  });
}, 60 * 1000); // Verifica cada minuto
// ✅ Función para reiniciar el temporizador de inactividad
function resetInactivityTimer() {
  lastCommandTime = Date.now();
  if (inactivityTimeout) clearTimeout(inactivityTimeout);
  inactivityTimeout = setTimeout(shutdownBot, 5 * 60 * 1000); // 5 minutos
}
// ✅ Evento: Cuando el bot está listo
client.once('ready', async () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
  const guild = await client.guilds.fetch(guildId);
  await guild.roles.fetch();

  for (const role of rolesToCreate) {
    if (!guild.roles.cache.find(r => r.name === role.name)) {
      await guild.roles.create({
        name: role.name,
        color: role.color,
        reason: 'Creación automática de roles',
      });
      console.log(`✔ Rol creado: ${role.name}`);
    }
  }
});

// ✅ Filtro de contenido y moderación
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // Filtro de malas palabras
  if (badWords.some(word => message.content.toLowerCase().includes(word))) {
    await message.delete();
    message.channel.send(`🚫 ${message.author} ¡No se permite lenguaje ofensivo!`);
    return logAction(`${message.author.tag} intentó decir una mala palabra.`);
  }

  // Filtro de spam
  if (message.content.length > 600) {
    await message.delete();
    message.channel.send(`📛 ${message.author} ¡No se permite spam!`);
    return logAction(`${message.author.tag} fue detectado por spam.`);
  }

  // ✅ Comandos
  if (!message.content.startsWith('¿')) return;
  const args = message.content.slice(1).trim().split(/ +/);
  const command = args.shift().toLowerCase();
  const member = message.member;
  const hasModRole = modRoles.some(role => member.roles.cache.some(r => r.name === role));

  // ✅ Comando de música con búsqueda automática
  if (command === 'musica') {
    const query = args.join(' ');
    if (!query) return message.reply('❌ Debes escribir el nombre de la canción o el enlace. Ej: `!musica Shape of You`');

    const voiceChannel = member.voice.channel;
    if (!voiceChannel) return message.reply('🔊 ¡Debes estar en un canal de voz!');

    try {
      let videoUrl = query;

      // ✅ Si no es un enlace, busca en YouTube usando la API sin necesidad de clave
      if (!query.startsWith('http')) {
        const result = await ytSearchApi.GetListByKeyword(query, false, 1);
        if (result.items.length === 0) return message.reply('❌ No se encontraron resultados para esa canción.');
        videoUrl = `https://www.youtube.com/watch?v=${result.items[0].id}`;
      }

      await distube.play(voiceChannel, videoUrl, {
        member: member,
        textChannel: message.channel,
        message: message,
      });
    } catch (err) {
      console.error('❌ Error al reproducir música:', err);
      message.channel.send('❌ Ocurrió un error al intentar reproducir la música.');
    }
  }

  // ✅ Moderación - solo roles autorizados
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
  // ✅ Integración con DeepSeek AI
  if (command === 'botsito') {
    const pregunta = args.join(' ');
    if (!pregunta) return message.reply('❌ Escribe tu pregunta. Ejemplo: `!botsito ¿Qué es JavaScript?`');
  
    const https = require('https');
    const data = JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "user", content: pregunta }]
    });
  
    const options = {
      hostname: 'api.deepseek.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apikey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };
  
    const req = https.request(options, res => {
      let responseData = '';
      res.on('data', chunk => { responseData += chunk; });
      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          if (result.choices && result.choices[0]) {
            const respuesta = result.choices[0].message.content;
  
            // ✅ Divide la respuesta en partes de máximo 1900 caracteres
            const partes = respuesta.match(/[\s\S]{1,1900}(\n|$)/g);
            const totalPartes = partes.length;
  
            // ✅ Envía cada parte numerada
            partes.forEach((parte, index) => {
              message.channel.send(`**Parte (${index + 1}/${totalPartes}):**\n${parte}`);
            });
  
          } else {
            message.reply('⚠️ La IA no devolvió una respuesta válida.');
            console.log('Respuesta incompleta:', result);
          }
        } catch (err) {
          console.error('❌ Error al parsear:', err);
          message.reply('❌ Error al procesar la respuesta.');
        }
      });
    });
  
    req.on('error', error => {
      console.error('❌ Error en la solicitud:', error);
      message.reply('❌ Hubo un error al conectar con la IA.');
    });
  
    req.write(data);
    req.end();
  }
   // ✅ Comando para pausar canción
   if (command === 'pausar') {
    const voiceChannel = member.voice.channel;
    if (!voiceChannel) return message.reply('🔇 Debes estar en un canal de voz para pausar la música.');

    const queue = distube.getQueue(message);
    if (!queue) return message.reply('❌ No hay música en reproducción.');

    if (queue.paused) {
      return message.reply('⏸ La música ya está pausada.');
    }

    queue.pause();
    message.channel.send('⏸ Música pausada.');
  }
  // ✅ Comando para reanudar canción
  if (command === 'reanudar') {
    const voiceChannel = member.voice.channel;
    if (!voiceChannel) return message.reply('🔊 Debes estar en un canal de voz para reanudar la música.');

    const queue = distube.getQueue(message);
    if (!queue) return message.reply('❌ No hay música en reproducción.');

    if (!queue.paused) {
      return message.reply('▶️ La música ya está en reproducción.');
    }

    queue.resume();
    message.channel.send('▶️ Música reanudada.');
  }
  // ✅ Comando para saltar canción
  if (command === 'saltar') {
    const voiceChannel = member.voice.channel;
    if (!voiceChannel) return message.reply('🔊 ¡Debes estar en un canal de voz para usar este comando!');
  
    try {
      const queue = distube.getQueue(voiceChannel);
      if (!queue) return message.reply('❌ No hay ninguna canción en reproducción.');
      if (!queue.songs[1]) return message.reply('⛔ No hay una siguiente canción para saltar.');
  
      await queue.skip();
      message.channel.send('⏭️ Canción saltada.');
    } catch (error) {
      console.error('❌ Error al saltar canción:', error);
      message.reply('❌ Ocurrió un error al intentar saltar la canción.');
    }
  }
  if (command === 'help') {
    const helpEmbed = {
      color: 0x1D82B6,
      title: '📜 Comandos de Botsito',
      description: 'Aquí tienes una lista de comandos que puedes usar:',
      fields: [
        {
          name: '🎵 Comandos de Música',
          value: `\`¿musica <nombre o link>\` – Reproduce una canción\n\`¿pausar\` – Pausa la canción actual\n\`¿reanudar\` – Reanuda la canción pausada\n\`¿saltar\` – Salta la canción actual`,
        },
        {
          name: '🤖 Comandos de IA',
          value: `\`¿botsito <pregunta>\` – Pregunta a la IA de DeepSeek`,
        },
        {
          name: '📢 Comandos de Anuncio de Stream',
          value: `\`¿stream leya\` – Anuncia el stream de Leya\n\`¿stream darkar\` – Anuncia el stream de Darkar`,
        },
        {
          name: '📌 Otros',
          value: `\`¿help\` – Muestra esta ayuda`,
        }
      ],
      footer: {
        text: 'Botsito al servicio del Polo Norte 🐧',
      }
    };
  
    message.channel.send({ embeds: [helpEmbed] });
  }
  // ✅ Anuncio de stream
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


// ✅ Eventos de música
distube
  .on('playSong', (queue, song) => {
    queue.textChannel.send(`🎶 Reproduciendo: **${song.name}** - \`${song.formattedDuration}\``);
  })
  .on('addSong', (queue, song) => {
    queue.textChannel.send(`✅ Canción agregada a la cola: **${song.name}**`);
  })
  .on('finish', queue => {
    queue.textChannel.send('✅ Se terminó la lista de reproducción.');
  })
  .on('error', (channel, error) => {
    console.error('❌ Error en DisTube:', error);
    channel.send('❌ Ocurrió un error en la reproducción.');
  });

// ✅ Función para registrar acciones en #registro-bot
async function logAction(text) {
  try {
    const guild = await client.guilds.fetch(guildId);
    const logChannel = guild.channels.cache.find(c => c.name === 'registro-bot');
    if (logChannel) logChannel.send(`📝 ${text}`);
  } catch (error) {
    console.error('❌ Error al registrar acción:', error);
  }
}

// ✅ Iniciar el bot
client.login(token);
