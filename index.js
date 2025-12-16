require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

const VOUCHES_FILE = path.join(__dirname, 'vouches.json');

async function loadVouches() {
    try {
        const data = await fs.readFile(VOUCHES_FILE, 'utf8');
        return JSON.parse(data);
    } catch {
        return {};
    }
}

async function saveVouches(vouches) {
    await fs.writeFile(VOUCHES_FILE, JSON.stringify(vouches, null, 2), 'utf8');
}

function createVouchEmbed(user, stars, productChannel, reason, proof, vouchCount) {
    const starEmoji = '⭐';
    const starsDisplay = starEmoji.repeat(stars) + '☆'.repeat(5 - stars);
    
    const embed = new EmbedBuilder()
        .setTitle(`${vouchCount} New Vouch`)
        .setColor(0x5865F2)
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .addFields(
            { name: 'User', value: `${user} (${user.tag})`, inline: true },
            { name: 'Rating', value: starsDisplay, inline: true },
            { name: 'Product Channel', value: productChannel, inline: false },
            { name: 'Reason', value: reason, inline: false }
        )
        .setTimestamp()
        .setFooter({ text: `User ID: ${user.id}` });

    if (proof) {
        embed.addFields({ name: 'Proof', value: proof, inline: false });
    }

    return embed;
}

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);
    
    const commands = [
        {
            name: 'vouch',
            description: 'Create a vouch',
            options: [
                {
                    name: 'stars',
                    type: 4,
                    description: 'Rating from 1-5 stars',
                    required: true,
                    min_value: 1,
                    max_value: 5
                },
                {
                    name: 'product-channel',
                    type: 3,
                    description: 'The product channel name or ID',
                    required: true
                },
                {
                    name: 'reason',
                    type: 3,
                    description: 'Reason for the vouch',
                    required: true
                },
                {
                    name: 'proof',
                    type: 3,
                    description: 'Proof (optional)',
                    required: false
                }
            ]
        },
        {
            name: 'restore-vouches',
            description: 'Restore vouches from database (Owner only)'
        }
    ];

    try {
        await client.application.commands.set(commands);
        console.log('Slash commands registered');
    } catch (error) {
        console.error('Error registering commands:', error);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'vouch') {
        if (interaction.channelId !== process.env.CHANNEL_ID) {
            return interaction.reply({ content: 'This command can only be used in the designated vouch channel.', ephemeral: true });
        }

        const member = interaction.member;
        if (!member.roles.cache.has(process.env.VOUCH_ROLE_ID)) {
            return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
        }

        const stars = interaction.options.getInteger('stars');
        const productChannel = interaction.options.getString('product-channel');
        const reason = interaction.options.getString('reason');
        const proof = interaction.options.getString('proof');

        if (reason.length > 1000) {
            return interaction.reply({ content: 'Reason must be 1000 characters or less.', ephemeral: true });
        }

        if (productChannel.length > 100) {
            return interaction.reply({ content: 'Product channel must be 100 characters or less.', ephemeral: true });
        }

        await interaction.deferReply();

        const vouches = await loadVouches();
        const guildId = interaction.guild.id;
        
        if (!vouches[guildId]) {
            vouches[guildId] = [];
        }

        const vouchData = {
            userId: interaction.user.id,
            username: interaction.user.tag,
            stars,
            productChannel,
            reason,
            proof: proof || null,
            timestamp: new Date().toISOString()
        };

        vouches[guildId].push(vouchData);
        await saveVouches(vouches);

        const vouchCount = vouches[guildId].length;
        const embed = createVouchEmbed(interaction.user, stars, productChannel, reason, proof, vouchCount);
        await interaction.editReply({ embeds: [embed] });
    }

    if (interaction.commandName === 'restore-vouches') {
        const member = interaction.member;
        if (!member.roles.cache.has(process.env.OWNER_ROLE_ID)) {
            return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        const vouches = await loadVouches();
        const guildId = interaction.guild.id;
        const guildVouches = vouches[guildId] || [];

        if (guildVouches.length === 0) {
            return interaction.editReply({ content: 'No vouches found to restore.' });
        }

        const channel = await interaction.guild.channels.fetch(process.env.CHANNEL_ID).catch(() => null);
        if (!channel) {
            return interaction.editReply({ content: 'Could not find the configured vouch channel.' });
        }

        const uniqueUserIds = [...new Set(guildVouches.map(v => v.userId))];
        const userCache = new Map();
        
        await Promise.all(uniqueUserIds.map(async userId => {
            try {
                const user = await client.users.fetch(userId);
                userCache.set(userId, user);
            } catch {}
        }));

        const restoreResults = await Promise.all(guildVouches.map(async (vouch, index) => {
            const user = userCache.get(vouch.userId);
            if (user) {
                try {
                    const vouchCount = index + 1;
                    const embed = createVouchEmbed(user, vouch.stars, vouch.productChannel, vouch.reason, vouch.proof, vouchCount);
                    await channel.send({ embeds: [embed] });
                    return true;
                } catch (error) {
                    console.error(`Error sending vouch for ${vouch.userId}:`, error);
                    return false;
                }
            }
            return false;
        }));

        const restored = restoreResults.filter(Boolean).length;
        await interaction.editReply({ content: `Successfully restored ${restored} out of ${guildVouches.length} vouches.` });
    }
});

client.login(process.env.BOT_TOKEN).catch(error => {
    console.error('Failed to login:', error);
    process.exit(1);
});

