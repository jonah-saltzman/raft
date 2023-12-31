import * as readline from 'readline'
import { StateMachine, LOG } from './raft'
import * as fs from 'fs'
import { isMessage } from './types'

export class Listener {

    io = readline.createInterface({input: process.stdin})
    fsm = new StateMachine(console.log, 1000, 500)

    public async listen() {
        fs.writeFileSync(LOG, "")
        const listener = this.getListener(this.io)
        for await (const line of listener) {
            const msg = JSON.parse(line)
            if (!isMessage(msg)) {
                throw new Error('invalid message')
            }
            this.fsm.receiveMsg(msg)
        }
    }

    private async* getListener(rl: readline.Interface) {
        for await (const line of rl) {
            yield line
        }
    }
}