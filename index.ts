import DiscordJS, { Intents, MessageEmbed, TextChannel } from 'discord.js'
import { MongoClient } from 'mongodb'
import dotenv from 'dotenv'
import * as deepl from 'deepl-node'
import * as EmbedUtils from './embedutils'
import * as TranslationUtils from './translationUtils'
import * as ChannelIds from './channelids'
import { SourceLanguageCode, TargetLanguageCode } from 'deepl-node'
import { google } from '@google-cloud/translate/build/protos/protos'
import { Stream } from 'stream'
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

var englishChannel: TextChannel;
var chineseChannel: TextChannel;
var koreanChannel: TextChannel;

const mongoClient = new MongoClient(process.env.MONGO_DB_URI || "");
const googleUsage = {
    characterUsed: 0,
    characterLimit: 0
}

client.on('ready', () => {
    console.log("Bot is ready!");
    mongoClient.connect();

    (async () => {
        const googleUsageFromDB = await getGoogleUsage();

        if (!googleUsageFromDB) {
            (client.channels.cache.get('') as TextChannel).send({
                embeds: [new MessageEmbed().setDescription("Could not load Google's usage from database.").setColor('BLUE')]
            });
            return;
        }

        googleUsage.characterUsed = googleUsageFromDB.characterUsed;
        googleUsage.characterLimit = googleUsageFromDB.characterLimit;
    })();
})

function setupDiscordCommands() {
    const guildId = "983293851928244264"
    const guild = client.guilds.cache.get(guildId)
    let commands

    if (guild) {
        commands = guild.commands
    } else {
        commands = client.application?.commands
    }

    commands?.create({
        name: 'deepl-usage',
        description: "Returns the usage count for DeepL's translation service."
    })

    commands?.create({
        name: 'google-usage',
        description: "Returns the usage count for Google's Cloud Translate's translation service."
    })
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
            const usage = await getGoogleUsage();

            if (usage === null || usage === undefined) {
                interaction.reply({
                    embeds: [new MessageEmbed().setDescription("Could not fetch usage on Google's Translation API! Check the logs.").setColor('BLUE')]
                });
                return;
            }

            interaction.reply({
                embeds: [EmbedUtils.createTranslatorUsageEmbed("Google's Cloud Translate", usage.characterUsed, usage.characterLimit)]
            })
        })();
    }
})

client.on('messageCreate', (message) => {
    if (message.author.bot) return;

    const guildTranslate = ChannelIds.findGuild(message.guildId || "");
    if (!guildTranslate) return;

    englishChannel = client.channels.cache.get(guildTranslate.channelsId.english) as TextChannel;
    chineseChannel = client.channels.cache.get(guildTranslate.channelsId.chinese) as TextChannel;
    koreanChannel = client.channels.cache.get(guildTranslate.channelsId.korean) as TextChannel;
    
    if (message.channelId === guildTranslate.channelsId.english) {
        deeplTranslate(message, chineseChannel, "#english-auto", 'en', 'zh');
        googleTranslate(message, koreanChannel, "#english-auto", 'ko');
        return;
    }

    if (message.channelId === guildTranslate.channelsId.chinese) {
        deeplTranslate(message, englishChannel, "#chinese-auto", 'zh', 'en-US');
        googleTranslate(message, koreanChannel, "#chinese-auto", 'ko');
        return;
    }

    if (message.channelId === guildTranslate.channelsId.korean) {
        googleTranslate(message, englishChannel, "#korean-auto", 'en');
        googleTranslate(message, chineseChannel, "#korean-auto", 'zh');
        return;
    }
})

function sendTranslationToChannel(message: DiscordJS.Message, channel: TextChannel, translatedText: string, sourceChannelName: string, translator: string) {
    if (translatedText) {
        (async () => {
            const embed = await EmbedUtils.createTranslatedMessageEmbed(message, translatedText, sourceChannelName, translator);
            channel.send({
                embeds: [embed]
            });
        })();
    }

    if (message.attachments.size > 0) {
        let attachments: (DiscordJS.BufferResolvable | Stream)[] = [];
        message.attachments.forEach((attachment) => {
            attachments.push(attachment.attachment);
        });
        channel.send({
            files: attachments
        });
    }
}

async function getGoogleUsage() {
    const usage = await mongoClient.db("Zekuru").collection("TranslationUsage").findOne({
        translator: "Google"
    });
    return usage;
}

async function deeplTranslate(message: DiscordJS.Message, destinationChannel: TextChannel, sourceChannelName: string, originalLang: SourceLanguageCode, targetLang: TargetLanguageCode) {
    try {
        let translation = "";
        const processedMessage = TranslationUtils.prepareForTranslation(message.content);
        
        if (message.content) {
            const usage = await deeplTranslator.getUsage();
            
            if (!usage.character) {
                message.channel.send({
                    embeds: [new MessageEmbed().setDescription("Could not check if there are still available characters on DeepL translation service! Check the logs.").setColor('BLUE')]
                });
                return;
            }

            if ((usage.character.count + message.content.length) > usage.character.limit) {
                message.channel.send({
                    embeds: [new MessageEmbed().setDescription("Uh oh! Cannot translate anymore using DeepL's translation API. The limit will be reached!").setColor('BLUE')]
                });
                return;
            }

            const result = await deeplTranslator.translateText(processedMessage.processedText, originalLang, targetLang);
            translation = result.text;
        }

        sendTranslationToChannel(message, destinationChannel, TranslationUtils.returnEmojisToTranslation(translation, processedMessage.emojiTable), sourceChannelName, "DeepL");
    }
    catch (e) {
        console.error(e);
        message.channel.send({
            embeds: [new MessageEmbed().setDescription("An error has occurred while processing translation using DeepL's translation API! Check the logs.").setColor('BLUE')]
        });
    }
}

async function googleTranslate(message: DiscordJS.Message, destinationChannel: TextChannel, sourceChannelName: string, targetLang: string) {
    try {
        const processedMessage = TranslationUtils.prepareForTranslation(message.content);
        let processedTranslation = "";

        if (message.content) {
            if ((googleUsage.characterUsed + message.content.length) > googleUsage.characterLimit) {
                message.channel.send({
                    embeds: [new MessageEmbed().setDescription("Uh oh! Cannot translate anymore using Google's Cloud Translate API. The limit will be reached!").setColor('BLUE')]
                });
                return;
            }
    
            const [translation] = await googleTranslator.translate(processedMessage.processedText, targetLang);
            processedTranslation = TranslationUtils.returnEmojisToTranslation(translation, processedMessage.emojiTable);
        }
        
        sendTranslationToChannel(message, destinationChannel, processedTranslation, sourceChannelName, "Google");
        if (!processedTranslation) return;

        mongoClient.db("Zekuru").collection("GoogleTranslateUsageEntries").insertOne({
            time: message.createdTimestamp,
            charCount: processedMessage.processedText.length,
            content: message.content
        });

        const usage = await getGoogleUsage();

        if (usage === null || usage === undefined) {
            message.channel.send({
                embeds: [new MessageEmbed().setDescription("Could not check if there are still available characters on Google's Cloud Translate API! Check the logs.").setColor('BLUE')]
            });
            return;
        }

        updateGoogleTotalUsageCount(usage);
    }
    catch (e) {
        console.error(e);
        message.channel.send({
            embeds: [new MessageEmbed().setDescription("An error has occurred while processing translation using Google's Cloud Translation API! Check the logs.").setColor('BLUE')]
        });
    }
}

async function updateGoogleTotalUsageCount(usage: any) {
    const cursor = mongoClient.db("Zekuru").collection("GoogleTranslateUsageEntries").find();
    
    const results = await cursor.toArray();

    usage.characterUsed = 0;
    if (results.length > 0) {
        results.forEach((result, i) => {
            usage.characterUsed += Number(result.charCount);
        })
    }

    googleUsage.characterUsed = usage.characterUsed;
    googleUsage.characterLimit = usage.characterLimit;

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

client.login(process.env.TOKEN)