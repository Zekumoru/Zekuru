import DiscordJS, { MessageEmbed } from 'discord.js';

export async function createTranslatedMessageEmbed(
  message: DiscordJS.Message,
  translatedText: string,
  sourceChannelName: string,
  translator: string
) {
  const member = await message.guild?.members.fetch(message.author.id);
  const embed = new MessageEmbed()
    .setAuthor({
      name: member?.displayName || message.author.username,
      iconURL: member?.avatarURL() || message.author.avatarURL() || '',
    })
    .setDescription(translatedText)
    .setColor('BLUE')
    .setFooter({
      text: `Translated from ${sourceChannelName} using ${translator}`,
    });
  return embed;
}

export function createTranslatorUsageEmbed(
  translator: string,
  characterUsed: number,
  characterLimit: number
) {
  const embed = new MessageEmbed()
    .setTitle('Character Usage: ' + translator)
    .setColor('BLUE')
    .addFields([
      {
        name: 'Used Characters',
        value: characterUsed.toString(),
        inline: true,
      },
      {
        name: 'Remaining Characters',
        value: (characterLimit - characterUsed).toString(),
        inline: true,
      },
      {
        name: 'Character Limit',
        value: characterLimit.toString(),
        inline: true,
      },
    ])
    .setFooter({
      text:
        characterUsed >= characterLimit
          ? 'Uh oh! The limit has been reached!'
          : 'The limit has not been reached... yet.',
    });
  return embed;
}
