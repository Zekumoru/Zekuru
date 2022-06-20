# Notes

## Discord

### Creating commands

```javascript
const guild = client.guilds.cache.get(guildId)
let commands

if (guild) {
    commands = guild.commands
} else {
    commands = client.application?.commands
}

commands?.create({
    name: nameOfCommand,
    description: descriptionOfCommand
})
```

### Handling commands

```javascript
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName, options } = interaction

    if (commandName === 'nameOfCommand') {
        // Execute command's code here
    }
});
```

### Deleting commands
Deleting is a bit tricky, basically, get the command's ID by using it first on Discord and printing out the ID from `interaction.commandId`.

Then use that id to delete the command through `guild.commands.delete('commandId')`.