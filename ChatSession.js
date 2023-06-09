import path from "path";
import os from "os";
import fs from "fs";
import util from "util";
import ora from "ora";
import {marked} from "marked";
import TerminalRenderer from "marked-terminal";
import chalk from "chalk";

// Prettify output to terminal
marked.setOptions({
    renderer: new TerminalRenderer({
        reflowText: true,
        width: 100,
        paragraph: chalk.blueBright
    })
});

class ChatSession {
    creationDate = new Date()
    system = '' // Steer behaviour of ChatGPT across sessions
    type = 'chat'
    messages = []
    temperature = 0.5
    totalTokens = 0
    stopToken = '##END##'
    status = 'NEW'
    transient = false;

    constructor(system, temperature, type = 'chat') {
        this.system = system
        this.temperature = temperature
        this.type = type;
        this.init()
    }

    async chat(openai, prompt) {
        if (this.status == 'DONE')
            return 'Session finished'
        if (prompt === "restart") {
            return this.reset();
        }
        if (prompt === "costs") {
            return this.costs();
        }

        this.messages.push({role: 'user', content: prompt})
        let response = await this._invokeAssistant(openai);
        this.messages.push({role: 'assistant', content: response})
        this.persist()

        return response;
    }

    async chatAndPrintToTerminal(openai, prompt, icon = '🤖') {
        const spinner = ora('Mastermind is processing').start();
        this.chat(openai, prompt)
            .then(res => {
                spinner.stop()
                console.log(` ${icon} ${marked(res).trim()}`)
            })
    }

    costs() {
        return `${(this.totalTokens / 1000 * 0.002).toFixed(4)} $  (${this.totalTokens} tokens)`
    }

    init() {
        this.status = 'NEW'
        this.totalTokens = 0
        this.messages = [{role: 'system', content: this.system || ""}]
    }

    reset() {
        this.init()
        this.persist()
        return 'Fresh session started'
    }

    async _invokeAssistant(openai) {
        // https://platform.openai.com/docs/api-reference/chat
        const result = await openai.createChatCompletion({
            messages: this.messages,
            temperature: this.temperature,
            stop: this.stopToken,
            model: 'gpt-3.5-turbo'
        })
        if (result.status !== 200)
            console.log(`ERROR(status=${response.status}): ${result.data}`)
        this.totalTokens += result.data.usage.total_tokens
        const answer = result.data.choices[0].message
        //console.log(util.inspect(result.data, {showHidden: false, depth: null, colors: true}))
        if (answer.content.indexOf(this.stopToken) !== -1)
            console.log("Session finished")
        return answer.content
    }

    persist() {
        if (this.transient)
            return  // Don't store if it's a single-prompt "session"
        const sessionPath = ChatSession._getSessionPath(this.type)
        try {
            const backup = JSON.stringify(this);
            fs.writeFileSync(sessionPath, backup)
        } catch(e) {
            console.log('ERROR: Failed to store ChatSession:', e)
        }
    }
};

ChatSession._getSessionPath = (type = 'chat') => {
    const sessionId = process.env.TERM_SESSION_ID || 'shared'
    return path.join(os.tmpdir(), `${sessionId}-${type}.json`)
}
ChatSession.restoreOrNew = function (
    system = 'NEVER SAY YOU ARE AN AI LANGUAGE MODEL.',
    temperature = 0.8,
    type = 'chat') {
    const sessionPath = ChatSession._getSessionPath(type);
    try {
        fs.statSync(sessionPath)
        const sessionJSON = fs.readFileSync(sessionPath, {encoding: 'utf8'})
        const restoredSession = Object.assign(new ChatSession(), JSON.parse(sessionJSON));
        restoredSession.creationDate = new Date(restoredSession.creationDate)
        const oneHourAgo = new Date(new Date().getTime() - 1000 * 60 * 60)
        if (restoredSession.creationDate < oneHourAgo) { // Save credits
            console.log('Previous session was more than one hour old => starting new session')
            throw Error('Session too old, starting with a fresh session')
        }
        return restoredSession
    } catch (e) {
        return new ChatSession(system, 0.8, type)
    }
}

export default ChatSession
