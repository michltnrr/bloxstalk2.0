require('dotenv').config()
require(`./server`)
const {Client, GatewayIntentBits} = require('discord.js')

let userIds = []
let userMap = new Map()
let onlineStatus = new Map()
let lastInteraction = null

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
})

client.once(`ready`, () => {
    console.log(`Logged in as ${client.user.tag}`)

    setInterval(() =>{
        if(!lastInteraction || userIds.length === 0) return 
        sendText(lastInteraction, userIds)
    }, 60_000)
})

client.on('interactionCreate', async(interaction) => {
    if(!interaction.isChatInputCommand()) return
    
    if(interaction.commandName === 'stalk') {
        const userId = Number(interaction.options.getString('userid'))
        if(userIds.includes(userId)) {
            await interaction.reply('User is already being stalked')
            return 
        }
        
        userIds.push(userId)
        onlineStatus.set(userId, 0)
        lastInteraction = interaction
        
        await interaction.reply("User is now being stalked, We'll let you know when they're online.")
        await sendText(interaction, userIds)
    }
})

async function getPresence(userIds) {
    try {
        const presensceReq = await fetch('https://presence.roblox.com/v1/presence/users', {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                "Cookie" : `.ROBLOXSECURITY=${process.env.ROBLOX_COOKIE}`
            },
            body: JSON.stringify({
                userIds : userIds
            })
        })
        
        return presensceReq.json()
    } catch(err) {
        console.log(`Error Getting Presence: ${err.message}`)
    }
}

async function getFriends(userIds) {
    try {
        const friendNames = await fetch(`https://users.roblox.com/v1/users`, {
            method: `POST`,
            headers: {
                "Content-Type": "application/json",
                "Cookie" : `.ROBLOXSECURITY=${process.env.ROBLOX_COOKIE}`
            }, 
            body: 
            JSON.stringify({
                userIds: userIds
            })
        })
        return friendNames.json()
    }catch(err) {
        console.log(`Erorr getting friend names: ${err.message}`)
    }
} 


async function sendText(interaction, userIds) {
    const presenceData = await getPresence(userIds)
    console.log(JSON.stringify(presenceData, null, 2))
    let friendsUsers = await getFriends(userIds)
    console.log(friendsUsers)
    
    let ingameFriends = []
    let loggedIn = []
    
    friendsUsers.data.forEach(usr => userMap.set(Number(usr.id), usr.displayName))
    
    try {
        presenceData.userPresences.forEach((el, i) => {
            const name = userMap.get(el.userId) || `User ${el.userId}`
            let lastStatus = onlineStatus.get(el.userId) || 0
            let currStatus = el.userPresenceType

            if(lastStatus === 0 && currStatus === 2) ingameFriends.push(name)
            else if(lastStatus === 0 && currStatus === 1) loggedIn.push(name)

            onlineStatus.set(el.userId, currStatus)

        })
    
    console.log(ingameFriends)
    console.log(loggedIn)
    
    if(ingameFriends.length === 0 && loggedIn.length === 0) return
    let text = ``
    
    if(ingameFriends.length > 0) 
        text += `🎮 Friend(s)  online and in game!\n •${ingameFriends.join('\n• ')}\n\n`    
    
    if(loggedIn.length > 0) 
        text += `👨🏾‍💻 Friends online, but not playing a game.\n • ${loggedIn.join('\n• ')}\n\n`


    await interaction.followUp({
        content: text,
        embeds: [{
            title: `Join your friend(s)!`,
            description: 'Click the link above to join your friend(s)',
            url: 'https://roblox.com/home',
        }]
    })
    
}catch(err) {
    console.log(`Error Sending Text: ${err.message}`)
}
}

client.on(`interactionCreate`, async(interaction) => {
    if(!interaction.isChatInputCommand()) return
    
    if(interaction.commandName === 'unstalk') {
        const userId = Number(interaction.options.getString('userid'))
        userIds = userIds.filter(id=> id !== userId)
        console.log(userMap)
       
        userMap.delete(userId)
        onlineStatus.delete(userId)
       
        await interaction.reply(`User ${userMap.get(userId)}, is no longer being stalked`)
    }

    else if(interaction.commandName === 'peep') {
        if(userMap.size === 0) {
            await interaction.reply("No users being stalked...for now")
            return
        }
        const text = [...userMap.values()].map(user => `•${user}`).join('\n')
        await interaction.reply(`Users being stalked:\n${text}`)
    }

    else if(interaction.commandName === 'abort') {
        userIds = []
        userMap.clear()
        onlineStatus.clear()
        lastInteraction = null
        await interaction.reply('Operation aborted, Watchlist clear.')
    }
})
client.login(process.env.BOT_TOKEN)