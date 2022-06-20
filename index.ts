import DiscordJS, { Intents, MessageEmbed, TextChannel } from 'discord.js'
import dotenv from 'dotenv'
import * as deepl from 'deepl-node'
dotenv.config()

/*const {Translate} = require('@google-cloud/translate').v2;
const CREDENTIALS = JSON.parse(process.env.GOOGLE_CREDENTIALS ?? "")
const googleTranslator = new Translate({
    credentials: CREDENTIALS,
    projectId: CREDENTIALS.project_id
})*/

const authKey = process.env.DEEPL_AUTH_KEY ?? ""
const deeplTranslator = new deepl.Translator(authKey)

// intents tell what our bot intends to do and what permissions it needs
// if we don't specify what the bot needs then it won't give us data about it
const client = new DiscordJS.Client({
    intents: [
        Intents.FLAGS.GUILDS, // we need this intent whenever we want to deal with guilds
        Intents.FLAGS.GUILD_MESSAGES
    ]
})

client.on('ready', () => {
    console.log("Bot is ready!");
    
    const guildId = "987752925688389672"
    const guild = client.guilds.cache.get(guildId)
    let commands

    if (guild) {
        commands = guild.commands
    } else {
        commands = client.application?.commands
    }
})

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName, options } = interaction

    if (commandName === 'deepl-usage') {
        (async () => {
            const usage = await deeplTranslator.getUsage();
            
            if (usage.character) {
                const embed = new MessageEmbed()
                .setTitle("Character Usage")
                .setColor('BLUE')
                .addFields([
                    {
                        name: "Used Characters",
                        value: usage.character.count.toString(),
                        inline: true
                    },
                    {
                        name: "Remaining Characters",
                        value: (usage.character.limit - usage.character.count).toString(),
                        inline: true
                    },
                    {
                        name: "Character Limit",
                        value: usage.character.limit.toString(),
                        inline: true
                    }
                ])
                .setFooter({
                    text: ((usage.character.count >= usage.character.limit)? "Uh oh! The limit has been reached!" : "The limit has not been reached... yet.")
                });
                
                interaction.reply({
                    embeds: [embed]
                });
            }
        })();
    }
})

client.on('messageCreate', (message) => {
    if (message.author.bot) return

    /*(async () => {
        const [translation] = await googleTranslator.translate(message.content, "zh");
        message.reply({
            content: `Translation: ${translation}`
        })
    })();*/

    /*(async () => {
        const result = await deeplTranslator.translateText(message.content, null, 'zh');

        const embed = new MessageEmbed()
        .setAuthor({
            name: message.author.username,
            iconURL: message.author.avatarURL() || ""
        })
        .setDescription(result.text)
        .setColor('BLUE');

        message.channel.send({
            embeds: [embed]
        });
    })();*/
})

client.login(process.env.TOKEN)