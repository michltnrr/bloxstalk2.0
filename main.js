require('dotenv').config()
const sgMail = require(`@sendgrid/mail`)
sgMail.setApiKey(process.env.SENDGRID_KEY)

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
                    4594160366
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
       const text = {
        //this doesnt work anymore, so my code doesnt work
        to: `${process.env.MY_NUMBER}@tmomail.net`,
        from: `michaeldturner21@gmail.com`,
        subject:"Bloxstalk status",
        text: `Your friend is currently online and in game!`
    }
    await sgMail.send(text)
}
else if(presenceData.userPresences[0].userPresenceType === 1) {
    const text = {
        to: `${process.env.MY_NUMBER}@tmomail.net`,
        from: `michaeldturner21@gmail.com`,
        subject:"Bloxstalk status",
        text: `Your friend just hopped online, but their currently not in game.`
}
        await sgMail.send(text)
    }
}

async function main() {
    sendText()
}
main()