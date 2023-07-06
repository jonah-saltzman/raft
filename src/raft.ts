import { Echo, EchoOk, GenerateOk, InitOk, isEcho, isGenerate, isInit, Routing } from "./types";
import { Interface } from "readline";
import * as fs from 'fs'
import { format } from 'util'
import { hostname } from "os";

export const LOG = '/Users/jonah-work/codebase/raft/out.txt'

export const log = (...args: any[]) => {
    console.error(...args)
    const str = format(...args, '\n')
    fs.appendFileSync(LOG, str)
}

export class StateMachine {

    send: (reply: string) => void
    curr_id = 0
    node_id = `${hostname()}-${process.pid}`
    nodes: string[] = []

    constructor(out: (reply: string) => void) {
        this.send = out
    }

    receiveMsg(msg: unknown) {
        log('processing msg: ', msg)
        if (isInit(msg)) {
            this.nodes = msg.body.node_ids
            const reply: InitOk = {
                ...this.swap(msg),
                body: {
                    type: 'init_ok',
                    in_reply_to: msg.body.msg_id,
                    msg_id: this.curr_id
                }
            }
            return this.sendReply(reply)
        }
        if (isEcho(msg)) {
            const reply: EchoOk = {
                ...this.swap(msg),
                body: {
                    type: 'echo_ok',
                    in_reply_to: msg.body.msg_id,
                    echo: msg.body.echo,
                    msg_id: this.curr_id
                }
            }
            return this.sendReply(reply)
        }
        if (isGenerate(msg)) {
            const reply: GenerateOk = {
                ...this.swap(msg),
                body: {
                    type: 'generate_ok',
                    in_reply_to: msg.body.msg_id,
                    id: `${this.node_id}-${this.curr_id}`,
                    msg_id: this.curr_id
                }
            }
            return this.sendReply(reply)
        }
        log('unknown msg: ', msg)
        throw new Error('unknown message')
    }

    swap(msg: Routing) {
        return { src: msg.dest, dest: msg.src }
    }

    sendReply(msg: unknown) {
        this.curr_id += 1
        const reply = JSON.stringify(msg)
        this.send(reply)
    }
}