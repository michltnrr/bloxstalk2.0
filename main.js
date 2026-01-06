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
                    14023206
                ]
            })
        })
    
    const data = await presensceReq.json()
    return data
    } catch(err) {
        console.log(`Error: ${err.message}`)
    }
}


async function main() {
    const presenceData = await getPresence()
    console.log(presenceData)
}
main()