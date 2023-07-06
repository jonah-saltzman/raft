#!/usr/bin/env node

const {Listener} = require('./dist')

const app = new Listener()
app.listen()