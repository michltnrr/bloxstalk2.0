require('dotenv').config()
require(`./server`)
console.log('MAIN.JS STARTED')

// fetch('https://discord.com/api/v10/gateway/bot', {
//     headers: { Authorization: `Bot ${process.env.BOT_TOKEN}` }
// })
// .then(async res => {
//     console.log('[REST TEST] status:', res.status)
//     console.log('[REST TEST] retry-after:', res.headers.get('retry-after'))
//     console.log('[REST TEST] body:', (await res.text()).slice(0, 300))
// })
// .catch(err => console.error('[REST TEST] failed:', err))

// safety net: a stray error should never take the whole bot down
process.on('unhandledRejection', err => console.error('Unhandled rejection:', err))
process.on('uncaughtException', err => console.error('Uncaught exception:', err))

                
const { supabase } = require('./supabase')
const {Client, GatewayIntentBits, Collection} = require('discord.js')


const client = new Client({
    intents: [GatewayIntentBits.Guilds],
})

client.rest.on('rateLimited', info => console.log('[REST rate limited]', {
    route: info.route,
    method: info.method,
    global: info.global,
    scope: info.scope,
    retryAfter: info.retryAfter
}))

client.rest.on('response', (req, res) => console.log('[REST]', req.method, req.path, res.status))

client.cooldowns = new Collection()

client.on('error', (err) => {
  console.error('Discord client error:', err)
})

client.on('shardDisconnect', (event, shardId) => {
  console.log(`Discord shard ${shardId} disconnected:`, event.code)
})

client.on('shardReconnecting', (shardId) => {
  console.log(`Discord shard ${shardId} reconnecting`)
})

const cooldowns = {
    stalk: 12,
    unstalk: 10,
    peep: 5,
    abort: 10
}

client.once(`ready`, () => {
    console.log(`Logged in as ${client.user.tag}`)

    checktrackedUsers()

    setInterval(checktrackedUsers, 60_000)
})

client.on('interactionCreate', async(interaction) => {
    if(!interaction.isChatInputCommand()) return
    
    const { commandName } = interaction

    if (!client.cooldowns.has(commandName)) {
        client.cooldowns.set(commandName, new Collection())
    }

    const now = Date.now()
    const timestamps = client.cooldowns.get(commandName)
    console.log(commandName);
    console.log(timestamps);
    console.log(timestamps.has(interaction.user.id));
    const cooldownAmount = (cooldowns[commandName] ?? 3) * 1000

    if (timestamps.has(interaction.user.id)) {

        const expirationTime =
            timestamps.get(interaction.user.id) + cooldownAmount

        if (now < expirationTime) {

            const remaining = Math.ceil((expirationTime - now) / 1000)

            return interaction.reply({
                content: `⏳ Please wait ${remaining} second(s) before using \`/${commandName}\` again.`,
                ephemeral: true
            })
        }
    }

    timestamps.set(interaction.user.id, now)
    console.log(client.cooldowns)

    setTimeout(() => {
        timestamps.delete(interaction.user.id)
    }, cooldownAmount)
    
    const userDiscordId = interaction.user.id
    
    try {
        if(interaction.commandName === 'stalk') {
            try {
                await interaction.deferReply()

                const targetUsername = interaction.options.getString('username')
                console.log(targetUsername)
                
                const targetuserData = await userNametoID(targetUsername)
                console.log(targetuserData)
                
                
                console.log(userDiscordId)
                
                if(targetuserData.data.length === 0) {
                    return await interaction.editReply("User doesn't exist, please enter a valid username.")
                }
                
                const targetUserid = [targetuserData.data[0].id]
                const targetUserDisplayName = targetuserData.data[0].displayName
                console.log(targetUserid)
                
                //get targets presence
                const targetpresenceData = await getPresence(targetUserid)
                const targetPresence = targetpresenceData.userPresences[0].userPresenceType
                console.log(targetpresenceData)
                console.log(`target online status number: ${targetPresence}`)

                //duplicate check before insert (see if users is alrdy trckn trgt)
                const {data, error} = await supabase
                .from('tracked-users')
                .select()
                .eq('discord_user_id', userDiscordId)
                .eq('tracked_user_id', Number(targetUserid))
                
                if(error) {
                    console.log(`Error checking for duplicate stalk insert`, error)
                    return await interaction.editReply('Database error, try again later')
                }
                console.log(data)

                if(data.length > 0) {
                    return await interaction.editReply(`You're already tracking ${targetUsername}`)
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
                    return await interaction.editReply(`Failed to initiate user tracking`)
                }
                

                if (targetPresence === 1 || targetPresence === 2) {
                const discordUser = await client.users.fetch(userDiscordId)

                let text

                if (targetPresence === 2) {
                    text = `🎮 ${targetUsername} is currently online and in game!`
                } else {
                    text = `👨🏾‍💻 ${targetUsername} is currently online!`
                }

                try {
                    await discordUser.send({
                        content: text,
                        embeds: [
                            {
                                title: "Join your friend!",
                                description: 'Click the link above to join your friend',
                                url: 'https://roblox.com/home',
                            }
                        ]
                    })

                } catch(dmErr) {
                    console.log(`Stalk DM to ${userDiscordId} failed:`, dmErr.code, dmErr.message)
                }

                }
                
                if(targetUsername !== targetUserDisplayName) 
                    await interaction.editReply(`${targetUsername} (${targetUserDisplayName}) is now being stalked, We'll let you know when they're online.`)
                
                else 
                    await interaction.editReply(`${targetUsername} is now being stalked, We'll let you know when they're online.`)
                
                // await sendText(interaction, userIds)
            } catch(err) {
                console.log(`Error running stalk command: ${err}`)

                try {
                    await interaction.editReply('Something went wrong, try again later')
                }catch(replyErr) {
                    console.log('Failed to send stalk error reply:', replyErr)
                }
            }
        } 

        else if(interaction.commandName === 'peep') {
            try {

                await interaction.deferReply()

                const {data, error} = await supabase
                .from('tracked-users')
                .select()
                .eq('discord_user_id',  userDiscordId)

                if(error) {
                    console.log(error)
                    return await interaction.editReply("Database error")
                }

                console.log(data)
                if(data.length === 0) {
                    await interaction.editReply(`You're not tracking anyone, use the "/stalk" command to start tracking...`)
                }

                else {
                    const stalkedUsers = data.map(user => `• ${user.roblox_username}`).join('\n')
                    console.log(stalkedUsers)
                    
                    console.log('peep reached reply!')
                    console.log('Attempting peep editReply...')
                    
                    await interaction.editReply(`Users being stalked by you: \n${stalkedUsers}`)
                    console.log('peep editReply succedded!')

                }
            } catch(err) {
                console.error(`Error running peep command:`, err)

                if(!interaction.replied) {
                    try {
                        await interaction.editReply({
                            content: 'Something went wrong running peep',
                            ephemeral: true
                        })

                    }catch(replyErr) {
                        console.error('Failed to send peep error reply:', replyErr)
                    }
                }
            }
        }

        else if (interaction.commandName === 'abort') {
            try {
                await interaction.deferReply()

                const {error: deleteError} = await supabase
                .from('tracked-users')
                .delete()
                .in('discord_user_id', [userDiscordId])

                if(deleteError) {
                console.error('Error clearing watchlist:', deleteError)
                return await interaction.editReply('Failed to clear watchlist, try again later')
                }

                await interaction.editReply('Watchlist cleared, no longer stalking any users')
            } catch(err) {
                console.log(`Error running abort command: ${err}`)

                try {
                    await interaction.editReply('Something went wrong, try again later')
                } catch(replyErr) {
                    console.error('Failed to send error reply:', replyErr)
                }
            }
        }

        else if (interaction.commandName === 'unstalk') {
            try {
                await interaction.deferReply()

                const targetUser = interaction.options.getString('username')
                const targetData = await userNametoID(targetUser)
                console.log(targetData)
                
                if(targetData.data.length === 0) {
                    return interaction.editReply('User doesnt exist (spell check the username).')
                }
                const targetId = targetData.data[0].id
                
                const {data, error} = await supabase
                .from('tracked-users')
                .delete()
                .eq('discord_user_id', userDiscordId)
                .eq('tracked_user_id', targetId)
                .select()
                console.log(data)

                if(error) {
                    console.log(error)
                    return interaction.editReply(`Something went wrong 😑`)
                }

                if(data.length === 0) {
                    return interaction.editReply(`You were never even tracking ${targetUser} 💀`)
                }

                await interaction.editReply(`No longer tracking ${targetUser}`)

            } catch(err) {
                console.log('Error running unstalk command', err)

                try {
                    await interaction.editReply('Something went wrong, try again later')
                }catch(replyErr) {
                    console.error('Failed to send error reply:', replyErr)
                }
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

//polling function, once enery minute, does one check for all tracked users in db
let isChecking = false
async function checktrackedUsers() {
    if(isChecking) return
    isChecking = true
    try {
        const notifications = new Map()
        
        const {data, error} = await supabase
        .from('tracked-users')    
        .select()

        
        if(error) {
            console.log('Error reading db', error)
            return 
        }
        if(!data || data.length === 0) return

        // console.log(data) //data is an array of objects w the prop 'tracked_user_id'
        const trackedusersIds = data.map((el) => el.tracked_user_id)
        // console.log(trackedusersIds)
        
        const uniqueusersIds = [...new Set(trackedusersIds)]

        const allpresenceCheck = await getPresence(uniqueusersIds)
        // console.log(allpresenceCheck)

        if(!allpresenceCheck?.userPresences) { //roblox sent an error back 
            console.log('Bad presence response:', allpresenceCheck)
            return 
        }

        const presenceMap = new Map()

        allpresenceCheck.userPresences.forEach((user) => {
            presenceMap.set(user.userId, user.userPresenceType)
        })

        for(const trackedUser of data) {
            const oldStatus = trackedUser.online_status
            const newStatus = presenceMap.get(trackedUser.tracked_user_id)

            // console.log(`${trackedUser.roblox_username}: DB= ${oldStatus}, Roblox=${newStatus}`)

            if(newStatus === undefined) {
                console.log(`No presence data for ${trackedUser.roblox_username}`)
                continue
            }
            // no status change
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
                }
                
                else if(newStatus === 2) {
                    userNotifications.ingame.push(trackedUser.roblox_username)
                }
            }
            const {error: updateError} = await supabase
            .from('tracked-users')
            .update({
                online_status: newStatus
            })
            .eq('id', trackedUser.id)

            if(updateError) {
                console.log('Error updating users presence', updateError)
            }
        }
        
        //send one DM per dc user
        for(const [discordId, users] of notifications) {
            let text = ""

            if(users.ingame.length > 0) {
                 text += `🎮 Friend(s) online and in game!\n •${users.ingame.join('\n• ')}\n\n`    
            }

            if(users.online.length > 0) {
                text += `👨🏾‍💻 Friend(s) online who just logged on.\n •${users.online.join('\n• ')}\n\n`
            }

            // one failed DM (closed DMs, etc.) must not block everyone else's notifications.
            // we just log and move on; the user's watchlist is left untouched.

            try {
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

            }catch(dmErr) {
                if(dmErr.code === 50278) {
                    //remove users no longer in the server
                    const {error: delError} = await supabase
                    .from('tracked-users')
                    .delete()
                    .eq('discord_user_id', discordId)
        
                    if(delError) console.error('Failed to remove user', discordId, delError)
                    else console.log(`Removed ${discordId} from tracked-users (no longer apart of server)`)
                } else {
                    //DMs off or anything else: log it
                    console.error(`DM to ${discordId} failed:`, dmErr.code, dmErr.message)
                }
            }
            }

        } catch(err) {
            console.log('Error polling users', err)
        } finally {
            isChecking = false
        }
    }

console.log('BOT_TOKEN exists:', Boolean(process.env.BOT_TOKEN))
console.log('Attempting Discord login...')

client.on('warn', (message) => {
    console.warn('[Discord warning]', message)
})

client.on('shardError', (err, shardId) => {
    console.error(`[Discord shard ${shardId}] Error:`, err)
})

client.on('shardReady', (shardId) => {
    console.log(`[Discord shard ${shardId}] READY`)
})

client.on('shardDisconnect', (event, shardId) => {
    console.log(`[Discord shard ${shardId}] DISCONNECTED:`, event.code, event.reason)
})

client.on('shardReconnecting', (shardId) => {
    console.log(`[Discord shard ${shardId}] RECONNECTING`)
})

client.on('invalidated', () => {
    console.error('[Discord] Session invalidated')
})

// retry login with backoff so a temporary block doesn't leave the bot dead
// (the express server keeps the process alive, so nothing else would retry)
let loginAttempts = 0
 
async function login() {
    try {
        await client.login(process.env.BOT_TOKEN)
        loginAttempts = 0
        console.log('[Discord] Login promise resolved')
    } catch(err) {
        loginAttempts++
        // retryAfter is in ms when discord.js gives us one; otherwise back off 5 min, doubling up to 1 hour
        const fallback = Math.min(5 * 60_000 * 2 ** (loginAttempts - 1), 60 * 60_000)
        const wait = (err.retryAfter ?? fallback) + 5_000
        console.error(`[Discord] Login failed (attempt ${loginAttempts}), retrying in ${Math.round(wait / 60000)} min:`, err.message)
        setTimeout(login, wait)
    }
}
 
login()