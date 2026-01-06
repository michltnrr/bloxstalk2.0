require('dotenv').config()
const userId = process.env.USER_ID

async function getPresence() {
    try {
        const presensceReq = await fetch('https://presence.roblox.com/v1/presence/users', {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                "Cookie" : `.ROBLOXSECURITY=${process.env.ROBLOX_COOKIE}`
            },
            body: JSON.stringify({
                "userIds" : [
                    userId
                ]
            })
        })
    
    const data = await presensceReq.json()
    return data
    } catch(err) {
        console.log(`Error: ${err.message}`)
    }
}

async function sendText() {
    const presenceData = await getPresence()
    if(presenceData.userPresences[0].userPresenceType === 2) {
       const text = await fetch(`https://discord.com/api/v10/channels/${process.env.CHANNEL_ID}/messages`, {
        method: 'POST',
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bot ${process.env.BOT_TOKEN}`
        },
        body: JSON.stringify({
            content: `Your friend is currently online and in game! Click the link below to join`,
            embeds: [
                {
                    title: `Join your friend!`,
                    description: `Click here to join your friend in game`,
                    url: `https://www.roblox.com/users/${userId}/profile`
                }
            ]
        })
        
    }) 
    if(!text.ok) {
        console.log(`Something went wrong`)
    }
}

    else if(presenceData.userPresences[0].userPresenceType === 1) {
        const text = await fetch(`https://discord.com/api/v10/channels/${process.env.CHANNEL_ID}/messages`, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bot ${process.env.BOT_TOKEN}`
            },
            body: JSON.stringify({
                content: `Your friend is currently online and in game!`,
            })  
        })
        if(!text.ok) {
            console.log(`Something went wrong`)
        }
    }
}

async function main() {
    sendText()
}
main()