#! /usr/bin/env node
import yargs from "yargs/yargs"
import ChatSession from "./ChatSession.js"
import {Configuration, OpenAIApi} from "openai"
import fs from "fs";
import path from "path";
import os from "os";

const configuration = loadOpenAIConfiguration();
const openai = new OpenAIApi(configuration);
const argv = yargs(yargs.hideBin(process.argv))
    .usage('CLI interface for ChatGPT to chat or help constructing shell commands.\nWill keep a history of conversation unless -r or -s is used.\nUsage: $0 [options] <query>')
    .example('cg How many seconds in a day')
    .example('cg -s Generate a 2048 bit rsa key')
    .boolean(['r', 's', 'e']) // Declare bools
    .alias('r', 'reset')
    .describe('r', 'Start a fresh session')
    .alias('s', 'shell')
    .describe('s', 'Return a shell command')
    .alias('e', 'explain')
    .describe('e', 'If used with -s will explain the command')
    .help('h')
    .alias('h', 'help')
    .argv
const session = ChatSession.restoreOrNew()
const prompt = argv._.join(" ")

// ShellMode
if (argv.shell == true) {
    const shellSystem = 'Output BASH commands.'
    const freshSession = new ChatSession(shellSystem, 0.2, 'shell')
    if (argv.explain !== true)
        freshSession.chatAndPrintToTerminal(openai, "DON\'T PROVIDE ANY EXPLANATIONS. " + prompt, '🖥️')
    else {
        const restored = ChatSession.restoreOrNew(shellSystem, 0.2, 'shell')
        const newPrompt = prompt !== "" || restored.messages.length === 1
        if (newPrompt) {
            freshSession.chatAndPrintToTerminal(openai, prompt + ". Explain the command.", '🖥️')
        } else {
            // Explain last command
            restored.transient = true // Don't add this to the history
            restored.chatAndPrintToTerminal(openai, "Explain the command", '🖥️')
        }
    }
}

// Default: Chat mode, keep a session across multiple invocations
else {
    // Reset session
    if (argv.reset == true)
        console.log(session.reset())
    await session.chatAndPrintToTerminal(openai, prompt)
}

function loadOpenAIConfiguration() {
    const configPath = path.join(os.homedir(), '.config', 'openai-config.json')
    let config;
    try {
        fs.statSync(configPath)
        config = JSON.parse(fs.readFileSync(configPath, {encoding: 'utf8'}));
    } catch (e) {
        console.log(`⚠️ Failed to load OpenAI API key from ${configPath}. Create the file with the following content: 
    {
        "APIKey": "<yourKey>"
    }\n\n`, e)
        process.exit(1)
    }

    return new Configuration({
        apiKey: config.APIKey,
    });
}


