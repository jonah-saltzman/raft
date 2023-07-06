import { Message, Echo, EchoOk, Generate, GenerateOk, Init, InitOk, isType, Routing, Broadcast, BroadcastOk, Read, ReadOk, GenericMessage, Topology, TopologyOk } from "./types"
import * as fs from 'fs'
import { format } from 'util'
import { hostname } from "os"

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
    messages: number[] = []
    topology: {[key: string]: string[]}

    constructor(out: (reply: string) => void) {
        this.send = out
    }

    receiveMsg(msg: GenericMessage) {
        log('processing msg: ', msg)
        if (isType<Read>(msg, 'read')) {
            const reply: ReadOk = this.getReply(msg, {messages: this.messages}, 'read_ok')
            return this.sendReply(reply)
        }
        if (isType<Broadcast>(msg, 'broadcast')) {
            this.messages.push(msg.body.message)
            const reply: BroadcastOk = this.getReply(msg, {}, 'broadcast_ok')
            return this.sendReply(reply)
        }
        if (isType<Topology>(msg, 'topology')) {
            this.topology = msg.body.topology
            const reply: TopologyOk = this.getReply(msg, {}, 'topology_ok')
            return this.sendReply(reply)
        }
        if (isType<Init>(msg, 'init')) {
            this.nodes = msg.body.node_ids
            const reply: InitOk = this.getReply(msg, {}, 'init_ok')
            return this.sendReply(reply)
        }
        if (isType<Echo>(msg, 'echo')) {
            const reply: EchoOk = this.getReply(msg, {echo: msg.body.echo}, 'echo_ok')
            return this.sendReply(reply)
        }
        if (isType<Generate>(msg, 'generate')) {
            const reply: GenerateOk = this.getReply(
                msg,
                {id: `${this.node_id}-${this.curr_id}`},
                'generate_ok'
            )
            return this.sendReply(reply)
        }
        log('unknown msg: ', msg)
        throw new Error('unknown message')
    }

    swap(msg: Routing) {
        return { src: msg.dest, dest: msg.src }
    }

    getReply<
        T extends Message<unknown, string>, 
        U extends {[k: string]: unknown}, 
        V extends string
    >(msg: T, body: U, desc: V): Message<U, V> {
        return {
            src: msg.dest,
            dest: msg.src,
            body: {
                ...body,
                msg_id: this.curr_id,
                type: desc,
                in_reply_to: msg.body.msg_id
            }
        }
    }

    sendReply(msg: GenericMessage) {
        this.curr_id += 1
        const reply = JSON.stringify(msg)
        this.send(reply)
    }
}