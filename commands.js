require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('stalk')
    .setDescription('Track a Roblox user by ID')
    .addStringOption(option =>
      option
        .setName('userid')
        .setDescription('Roblox user ID to track')
        .setRequired(true)
    )
    .toJSON(),

    new SlashCommandBuilder()
    .setName('unstalk')
    .setDescription('Stop tracking Roblox User')
    .addStringOption(option => 
      option
        .setName('userid')
        .setDescription('User ID of person to stop tracking')
        .setRequired(true)
    ).toJSON(),

    new SlashCommandBuilder()
    .setName('peep')
    .setDescription('Get list of all currently tracked users')
    .toJSON(),

    new SlashCommandBuilder()
    .setName('abort')
    .setDescription('Stop tracking all users')
    .toJSON()
];

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    console.log('Registering slash commands...');

    await rest.put(
      Routes.applicationGuildCommands(
          process.env.APP_ID, 
          process.env.BLOXSTALK_SERVER_ID,
      ),
      { body: commands }
    );

    console.log('Slash commands registered!');
  } catch (err) {
    console.error(err);
  }
})();
