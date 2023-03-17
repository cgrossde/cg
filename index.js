#! /usr/bin/env node
import yargs from "yargs/yargs"
import {spawn} from "child_process";
import ChatSession from "./ChatSession.js"
import {Configuration, OpenAIApi} from "openai"
import fs from "fs";
import path from "path";
import os from "os";

const configuration = loadOpenAIConfiguration();
const openai = new OpenAIApi(configuration);
const options = yargs(yargs.hideBin(process.argv))
    .usage('CLI interface for ChatGPT to chat or help constructing shell commands.\nWill keep a history of conversation unless -r or -s is used.\nUsage: $0 [options] <prompt>')
    .example('cg How many seconds in a day')
    .example('cg -s Generate a 2048 bit rsa key')
    .example('cg -sx')
    .example('cg -b Act like a travel agent recommending me places to explore')
    .example('cat personas/Glados | cg -b')
    .boolean(['r', 's', 'e', 'x', 'b']) // Declare bools
    .alias('r', 'reset')
    .describe('r', 'Start a fresh session')
    .alias('b', 'bias')
    .describe('b', 'Bias the Assistant to act in a certain way')
    .alias('s', 'shell')
    .describe('s', 'Return a shell command')
    .alias('e', 'explain')
    .describe('e', 'If used with -s will explain the last command')
    .alias('x', 'execute')
    .describe('x', 'If used with -s will execute the last command')
    .help('h')
    .alias('h', 'help')
const argv = options.argv
const session = ChatSession.restoreOrNew()
const pipedInput = await getPipedInput() // Check for piped input
const prompt = `${argv._.join(" ")} ${pipedInput}`.trim()  // Append piped input to prompt

// ShellMode
if (argv.shell === true)
    bashCommandAssistant();
// Reset session
else if (argv.reset === true)
    console.log(session.reset())
// Bias / set system
else if (argv.bias === true) {
    session.messages[0].content = prompt + '. NEVER SAY YOU ARE AN AI LANGUAGE MODEL INSTEAD ANSWER THE QUESTION DIRECTLY.'
    console.log('Bias updated')
    session.persist()
}
// Chat mode, keep a session across multiple invocations
else if (prompt !== "")
    await session.chatAndPrintToTerminal(openai, prompt)
else
    options.showHelp()


function loadOpenAIConfiguration() {
    const configPath = path.join(os.homedir(), '.config', 'openai-config.json')
    let config;
    try {
        fs.statSync(configPath)
        config = JSON.parse(fs.readFileSync(configPath, {encoding: 'utf8'}));
    } catch (e) {
        console.log(`⚠️ Failed to load OpenAI API key from ${configPath}. Create the file with the following content:\n 
    {
        "APIKey": "<yourKey>"
    }\n\n`, e)
        process.exit(1)
    }

    return new Configuration({
        apiKey: config.APIKey,
    });
}

function bashCommandAssistant() {
    const shellSystem = 'Output BASH commands.'
    const freshSession = new ChatSession(shellSystem, 0.2, 'shell')
    if (argv.explain !== true && argv.execute !== true)
        freshSession.chatAndPrintToTerminal(openai, "DON\'T PROVIDE ANY EXPLANATIONS. " + prompt, '🖥️')
    else {
        const restored = ChatSession.restoreOrNew(shellSystem, 0.2, 'shell')
        const newPrompt = prompt !== "" || restored.messages.length === 1
        if (newPrompt) {
            freshSession.chatAndPrintToTerminal(openai, prompt + ". Explain the command.", '🖥️')
        } else if (argv.explain === true) { // Explain last command
            restored.transient = true // Don't add this to the history
            restored.chatAndPrintToTerminal(openai, "Explain the command", '🖥️')
        } else if (argv.execute === true) {
            const command = restored.messages[restored.messages.length - 1].content;
            console.log('Executing: "', command, '" with CWD:', os.tmpdir())
            const run = spawn(command, {
                cwd: os.tmpdir(),
                shell: process.env.SHELL
            });
            run.stdout.setEncoding('utf8')
            run.stderr.setEncoding('utf8')
            run.stdout.on('data', console.log)
            run.stderr.on('data', console.log)
            run.on('close', exitCode => {
                console.log('Exit code:', exitCode)
                process.exit(exitCode)
            })
        }
    }
}

/**
 * Wait for 5ms if something was piped from another process to this one
 */
async function getPipedInput() {
    return new Promise((resolve, reject) => {
        let dataReceived = false
        let dataIn = ""
        process.stdin.on('data', function (data) {
            dataReceived = true
            dataIn += data
        });
        process.stdin.on('end', function () {
            resolve(dataIn)
        });
        process.stdin.on('error', reject)
        // Stop waiting for piped input after 5ms
        setTimeout(() => {
            if (!dataReceived) {
                process.stdin.destroy() // Otherwise this process will never end when no input is piped
                resolve("")
            }
        }, 5)
    })
}

