export const guilds = [
  {
    name: 'Bot Development',
    id: '987752925688389672',
    channelsId: {
      english: '988287662580436992',
      chinese: '988287682142691338',
      korean: '988287699876200478',
    },
  },
  {
    name: 'Server 144',
    id: '983293851928244264',
    channelsId: {
      english: '988305908977238036',
      chinese: '988305931781677078',
      korean: '988305952275054622',
    },
  },
  {
    name: 'Arcanians',
    id: '659785216281280516',
    channelsId: {
      english: '983813503662055454',
      chinese: '983813536931250246',
      korean: '989619127960350770',
    },
  },
];

export function findGuild(guildId: string) {
  for (let guild of guilds) {
    if (guild.id === guildId) {
      return guild;
    }
  }
  return null;
}
