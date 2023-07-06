import * as readline from 'readline'
import { StateMachine, log, LOG } from './raft'
import * as fs from 'fs'

export class Listener {

    io = readline.createInterface({input: process.stdin})
    fsm = new StateMachine(console.log)

    public async listen() {
        fs.writeFileSync(LOG, "")
        const listener = this.getListener(this.io)
        for await (const line of listener) {
            const msg = JSON.parse(line)
            this.fsm.receiveMsg(msg)
        }
    }

    private async* getListener(rl: readline.Interface) {
        for await (const line of rl) {
            yield line
        }
    }
}