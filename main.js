require('dotenv').config()
const {Client, GatewayIntentBits} = require('discord.js')

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
})

client.once(`ready`, () => {
    console.log(`Logged in as ${client.user.tag}`)
})

client.on('interactionCreate', async(interaction) => {
    if(!interaction.isChatInputCommand()) return

    if(interaction.commandName === 'stalk') {
        const userId = interaction.options.getString('userid')
        await sendText(userId, interaction)
    }
})

async function getPresence(userId) {
    try {
        const presensceReq = await fetch('https://presence.roblox.com/v1/presence/users', {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                "Cookie" : `.ROBLOXSECURITY=${process.env.ROBLOX_COOKIE}`
            },
            body: JSON.stringify({
                userIds : [
                    userId
                ]
            })
        })
    
    const data = await presensceReq.json()
    return data
    } catch(err) {
        console.log(`Error in getPresence: ${err.message}`)
    }
}

async function sendText(userId, interaction) {
    const presenceData = await getPresence(userId)
    try {
        if(presenceData.userPresences[0].userPresenceType === 2) {
        await interaction.reply({
            content: `Your friend is currently online and in game! Click the link below to join`,
            embeds: [
                {
                    title: `Join your friend!`,
                    description: `Click here to join your friend in game`,
                    url: `https://www.roblox.com/users/${userId}/profile`
                }
            ]
    
        })
    }
   
    else if(presenceData.userPresences[0].userPresenceType === 1) {
        await interaction.reply(`Your friend is online, but they're currently not in a game`)
    }
    
}catch(err) {
        console.log(`Error Sending Text: ${err.message}`)
    }
}

client.login(process.env.BOT_TOKEN)