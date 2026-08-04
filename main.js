require('dotenv').config()
// require(`./server`)
const { supabase } = require('./supabase')
const {Client, GatewayIntentBits, Integration} = require('discord.js')


const client = new Client({
    intents: [GatewayIntentBits.Guilds]
})

client.once(`ready`, () => {
    console.log(`Logged in as ${client.user.tag}`)

    // setInterval(() =>{
    //     checktrackedUsers()
    // }, 1000)
})

client.on('interactionCreate', async(interaction) => {
    if(!interaction.isChatInputCommand()) return
    
    const userDiscordId = interaction.user.id
    
    try {
        if(interaction.commandName === 'stalk') {
            try {
                const targetUsername = interaction.options.getString('username')
                console.log(targetUsername)
                
                const targetuserData = await userNametoID(targetUsername)
                console.log(targetuserData)
                
                
                console.log(userDiscordId)
                
                if(targetuserData.data.length === 0) {
                    return await interaction.reply("User doesn't exist, please enter a valid username.")
                }
                
                const targetUserid = [targetuserData.data[0].id]
                const targetUserDisplayName = targetuserData.data[0].displayName
                console.log(targetUserid)
                
                //get targets presence
                const targetpresenceData = await getPresence(targetUserid)
                const targetPresence = targetpresenceData.userPresences[0].userPresenceType
                console.log(targetpresenceData)
                console.log(`target online status number: ${targetPresence}`)

                //duplicate check before insert (see if users is alrdy trckn trgt)c
                const {data, error} = await supabase
                .from('tracked-users')
                .select()
                .eq('discord_user_id', userDiscordId)
                .eq('tracked_user_id', Number(targetUserid))
                
                if(error) {
                    console.log(`Error checking for duplicate stalk inset`, error)
                }
                console.log(data)

                if(data.length > 0) {
                    return await interaction.reply(`You're already tracking ${targetUsername}`)
                }

                const {error: insertError} = await supabase
                .from('tracked-users')
                .insert({
                    discord_user_id: userDiscordId,
                    tracked_user_id: Number(targetUserid),
                    roblox_username: targetUsername,
                    online_status: targetPresence             
                })
                console.log(insertError)

                if(insertError) {
                    console.log(insertError)
                    return await interaction.reply(`Faield to initiate user tracking`)
                }
                
                
                if(targetUsername !== targetUserDisplayName) 
                    await interaction.reply(`${targetUsername} (${targetUserDisplayName}) is now being stalked, We'll let you know when they're online.`)
                
                else 
                    await interaction.reply(`${targetUsername} is now being stalked, We'll let you know when they're online.`)
                
                // await sendText(interaction, userIds)
            } catch(err) {
                console.log(`Error running stalk command: ${err}`)
            }
        } 

        else if(interaction.commandName === 'peep') {
            try {
                const {data, error} = await supabase
                .from('tracked-users')
                .select()
                .eq('discord_user_id',  userDiscordId)

                console.log(data)
                if(data.length === 0) {
                    await interaction.reply(`You're not tracking anyone, use the "/stalk" command to start tracking...`)
                }

                else {
                    const stalkedUsers = data.map(user => `• ${user.roblox_username}`).join('\n')
                    console.log(stalkedUsers)
                    await interaction.reply(`Users being stalked by you: \n${stalkedUsers}`)

                }
            } catch(err) {
                console.log(`Error running peep command: ${err}`)
            }
        }

        else if (interaction.commandName === 'abort') {
            try {
                const deleteResposne = await supabase
                .from('tracked-users')
                .delete()
                .in('discord_user_id', [userDiscordId])

                await interaction.reply('Watchlist cleared, no longer stalking any users')
            } catch(err) {
                console.log(`Error running abort command: ${err}`)
            }
        }

        else if (interaction.commandName === 'unstalk') {
            try {
                const targetUser = interaction.options.getString('username')
                const targetData = await userNametoID(targetUser)
                console.log(targetData)
                const targetId = targetData.data[0].id

                if(targetData.data.length === 0) {
                    return interaction.reply('User doesnt exist (spell check the username).')
                }
                
                const {data, error} = await supabase
                .from('tracked-users')
                .delete()
                .eq('discord_user_id', userDiscordId)
                .eq('tracked_user_id', targetId)
                .select()
                console.log(data)

                if(error) {
                    console.log(error)
                    return interaction.reply(`Something went wrong 😑`)
                }

                if(data.length === 0) {
                    return interaction.reply(`You were never even tracking ${targetUser} 💀`)
                }

                await interaction.reply(`No longer tracking ${targetUser}`)

            } catch(err) {
                console.log('Error running unstalk command', err)
            }
        }
    } catch(err) {
        console.log('Error running slash commands', err)

    }
})

async function userNametoID(username) {
    try {

        const userIdsReq = await fetch('https://users.roblox.com/v1/usernames/users', {
            method: 'POST',
            headers: {
                "Content-Type" : 'application/json',
                "Cookie" : `.ROBLOXSECURITY=${process.env.ROBLOX_COOKIE}`
            },
            body: JSON.stringify({
                usernames: [username] 
            })
        })
        return await userIdsReq.json()
    } catch(err) {
        console.log(`Error converting uername to userID: ${err}`)
    }

}

//here userIds is an array, the endpoint expects an array
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
        
        return await presensceReq.json()
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
        text += `🎮 Friend(s) online and in game!\n •${ingameFriends.join('\n• ')}\n\n`    
    
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

//polling function, once enery minute, does one check for all tracked users in db
async function checktrackedUsers() {
    try {
        const notifications = new Map()
        
        const {data, error} = await supabase
        .from('tracked-users')    
        .select()

        if(error) {
            console.log('Error readind db', error)
            return 
        }

        console.log(data) //data is an array of objects w the prop 'tracked_user_id'
        const trackedusersIds = data.map((el) => el.tracked_user_id)
        console.log(trackedusersIds)
        
        const uniqueusersIds = [...new Set(trackedusersIds)]
        const allpresenceCheck = await getPresence(uniqueusersIds)
        console.log(allpresenceCheck)

        const presenceMap = new Map()

        allpresenceCheck.userPresences.forEach((user) => {
            presenceMap.set(user.userId, user.userPresenceType)
        })

        for(const trackedUser of data) {
            const oldStatus = trackedUser.online_status
            const newStatus = presenceMap.get(trackedUser.tracked_user_id)

            if(oldStatus === newStatus) {
                continue
            }
            
            if(oldStatus === 0 && (newStatus === 1 || newStatus === 2)){

                if(!notifications.has(trackedUser.discord_user_id)) {
                    notifications.set(trackedUser.discord_user_id, {
                        online:[],
                        ingame: []
                    })
                }
                const userNotifications = notifications.get(trackedUser.discord_user_id)

                if(newStatus === 1) {
                    userNotifications.online.push(trackedUser.roblox_username)
                    
                    const {error} = await supabase
                    .from('tracked-users')
                    .update({online_status:1})
                    .eq('id', trackedUser.id)
                }
                
                else if(newStatus === 2) {
                    userNotifications.ingame.push(trackedUser.roblox_username)
                    
                    const {error} = await supabase
                    .from('tracked-users')
                    .update({online_status:2})
                    .eq('id', trackedUser.id)
                }
                //db update for presence still needed here

            }
        }

        for(const [discordId, users] of notifications) {
            let text = ""

            if(users.ingame.length > 0) {
                 text += `🎮 Friend(s) online and in game!\n •${users.ingame.join('\n• ')}\n\n`    
            }

            if(users.online.length > 0) {
                text += `👨🏾‍💻 Friends online, but not playing a game.\n • ${users.online.join('\n• ')}\n\n`

            }

            const discordUser = await client.users.fetch(discordId)
            await discordUser.send({
                content: text,
                embeds: [
                    {
                        title: "Join your friend(s)!",
                        description: 'Click the link above to join your friend(s)',
                        url: 'https://roblox.com/home',
                    }
                ]
            })
        }
    } catch(err) {
        console.log('Error polling users', err)
    }
}

checktrackedUsers()
client.login(process.env.BOT_TOKEN)