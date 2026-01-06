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
