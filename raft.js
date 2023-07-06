#!/usr/bin/env node

const {Listener} = require('./dist')

async function main() {
    const app = new Listener()
    await app.listen()
}

main().catch(console.log)