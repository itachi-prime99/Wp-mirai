const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const P = require('pino');
const fs = require('fs');
const path = require('path');

// Load command handler
const commandsPath = path.join(__dirname, 'commands');
const commands = {};

fs.readdirSync(commandsPath).forEach(file => {
    if (file.endsWith('.js')) {
        const command = require(`./commands/${file}`);
        commands[command.name] = command;
    }
});

async function startEren() {
    const { state, saveCreds } = await useMultiFileAuthState('./session');

    const sock = makeWASocket({
        auth: state,
        logger: P({ level: 'silent' }),
        printQRInTerminal: true,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const body = msg.message.conversation || msg.message.extendedTextMessage?.text;
        if (!body) return;

        const commandName = body.startsWith('.') ? body.slice(1).split(' ')[0] : null;
        const command = commands[commandName];

        if (command) {
            try {
                await command.execute(sock, msg);
            } catch (e) {
                await sock.sendMessage(msg.key.remoteJid, { text: '⚠️ কমান্ড চালাতে সমস্যা হয়েছে।' });
                console.error(e);
            }
        }
    });
}

startEren();
