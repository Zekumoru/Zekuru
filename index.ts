import DiscordJS, { Intents, MessageEmbed, TextChannel } from 'discord.js'
import { MongoClient } from 'mongodb'
import dotenv from 'dotenv'
import * as deepl from 'deepl-node'
import * as EmbedUtils from './embedutils'
import * as ChannelIds from './channelids'
import { SourceLanguageCode, TargetLanguageCode } from 'deepl-node'
dotenv.config()

const {Translate} = require('@google-cloud/translate').v2;
const CREDENTIALS = JSON.parse(process.env.GOOGLE_CREDENTIALS ?? "")
const googleTranslator = new Translate({
    credentials: CREDENTIALS,
    projectId: CREDENTIALS.project_id
})

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

let englishChannel: TextChannel
let chineseChannel: TextChannel
let koreanChannel: TextChannel

const mongoClient = new MongoClient(process.env.MONGO_DB_URI || "");

client.on('ready', () => {
    console.log("Bot is ready!");
    englishChannel = client.channels.cache.get(ChannelIds.english) as TextChannel;
    chineseChannel = client.channels.cache.get(ChannelIds.chinese) as TextChannel;
    koreanChannel = client.channels.cache.get(ChannelIds.korean) as TextChannel;
    setupDiscordCommands();
})

function setupDiscordCommands() {
    const guildId = "987752925688389672"
    const guild = client.guilds.cache.get(guildId)
    let commands

    if (guild) {
        commands = guild.commands
    } else {
        commands = client.application?.commands
    }
}

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName, options } = interaction

    if (commandName === 'deepl-usage') {
        (async () => {
            const usage = await deeplTranslator.getUsage();
            if (usage.character) {
                interaction.reply({
                    embeds: [EmbedUtils.createTranslatorUsageEmbed("DeepL Translator", usage.character.count, usage.character.limit)]
                });
            }
        })();
        return;
    }

    if (commandName === 'google-usage') {
        (async () => {
            try {
                mongoClient.connect();
                
                const usage = await mongoClient.db("Zekuru").collection("TranslationUsage").findOne({
                    translator: "Google"
                });

                if (usage) {
                    interaction.reply({
                        embeds: [EmbedUtils.createTranslatorUsageEmbed("Google's Cloud Translate", usage.characterUsed, usage.characterLimit)]
                    })
                }
                else {
                    interaction.reply({
                        content: "Could not fetch Google's translator usage from MongoDB! Check the source code."
                    })
                }
            }
            catch (e) {
                console.error(e);
                interaction.reply({
                    content: "An error has occurred fetching Google's translator usage from MongoDB! Check the logs."
                })
            }
        })();
    }
})

client.on('messageCreate', (message) => {
    if (message.author.bot) return;
    if (!(message.channelId === ChannelIds.english || message.channelId === ChannelIds.chinese || message.channelId === ChannelIds.korean)) return;

    if (message.channelId === ChannelIds.english) {
        deeplTranslate(message, chineseChannel, 'en', 'zh');
        googleTranslate(message, koreanChannel, 'ko');
        return;
    }

    if (message.channelId === ChannelIds.chinese) {
        deeplTranslate(message, englishChannel, 'zh', 'en-US');
        googleTranslate(message, koreanChannel, 'ko');
        return;
    }

    if (message.channelId === ChannelIds.korean) {
        googleTranslate(message, englishChannel, 'en');
        googleTranslate(message, chineseChannel, 'zh');
        return;
    }
})

function sendTranslationToChannel(message: DiscordJS.Message, channel: TextChannel, translator: string, translated: string) {
    const embed = EmbedUtils.createTranslatedMessageEmbed(message, translator, translated);
    channel.send({
        embeds: [embed]
    });
}

async function connectAndUpdateGoogleUsage(message: DiscordJS.Message) {
    try {
        mongoClient.connect();
        const usage = await mongoClient.db("Zekuru").collection("TranslationUsage").findOne({
            translator: "Google"
        });

        if (usage) {
            usage.characterUsed += message.content.length;
            await mongoClient.db("Zekuru").collection("TranslationUsage").updateOne(
                {
                    translator: "Google"
                },
                {
                    $set: usage
                },
                {
                    upsert: true
                });
        }
        else {
            message.reply({
                content: "Could not connect to MongoDB! Check the source code."
            })
        }
    }
    catch (e) {
        console.error(e);
        message.reply({
            content: "An error has occurred connecting to MongoDB! Check the logs."
        })
    }
}

async function deeplTranslate(message: DiscordJS.Message, destination: TextChannel, originalLang: SourceLanguageCode, targetLang: TargetLanguageCode) {
    try {
        const result = await deeplTranslator.translateText(message.content, originalLang, targetLang);
        sendTranslationToChannel(message, destination, "DeepL Translation API", result.text);
    }
    catch (e) {
        console.error(e);
        message.channel.send({
            content: "An error has occurred while processing translation using Google's Cloud Translation API! Check the logs."
        })
    }
}

async function googleTranslate(message: DiscordJS.Message, destination: TextChannel, targetLang: string) {
    connectAndUpdateGoogleUsage(message);
    try {
        const [translation] = await googleTranslator.translate(message.content, targetLang);
        sendTranslationToChannel(message, destination, "Google's Cloud Translation API", translation);
    }
    catch (e) {
        console.error(e);
        message.channel.send({
            content: "An error has occurred while processing translation using Google's Cloud Translation API! Check the logs."
        })
    }
}

client.login(process.env.TOKEN)