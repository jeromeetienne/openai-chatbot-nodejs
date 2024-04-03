// node imports
import ReadlinePromises from "readline/promises"
import Fs from 'fs'
import Path from 'path'

// npm imports
import CliColor from "cli-color"
import Debug from 'debug'
import * as Zod from "zod";

// langchain imports
import { AgentExecutor, createOpenAIToolsAgent } from "langchain/agents";
import { ChatOpenAI } from "@langchain/openai";
import { StructuredTool, DynamicStructuredTool } from "@langchain/core/tools";
import { ChatPromptTemplate, MessagesPlaceholder, SystemMessagePromptTemplate } from "@langchain/core/prompts";
import { ChatMessageHistory } from "langchain/stores/message/in_memory";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";

// local imports
import TextSpinner from "./text_spinner.js";

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

// use npm debug - setup a debug log function
const debug = Debug('openai-chatbot')

// define __dirname for ES6 modules
const __dirname = Path.dirname(new URL(import.meta.url).pathname);

// init text spinner - to show a spinner while waiting for the api response
const textSpinner = new TextSpinner()

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Init readline
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

// init readline history
let readlineHistory = /** @type {string[]} */([])
const readlineHistoryPath = Path.join(__dirname, `../data/readline-history.json`)

// test if the history file exists
let historyFileExists = await Fs.promises.access(readlineHistoryPath).then(() => true).catch(() => false)
if (historyFileExists === true) {
	const fileContent = await Fs.promises.readFile(readlineHistoryPath, 'utf-8')
	readlineHistory = JSON.parse(fileContent)
}

// init readline
const readline = ReadlinePromises.createInterface({
	input: process.stdin,
	output: process.stdout,
	history: readlineHistory
})

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

const systemMessage = `You are a helpful assistant. You are helping a user to get the current weather in a given location.`

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	add a tool
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

const tools = /** @type {StructuredTool[]} */([])

const weatherTool = new DynamicStructuredTool({
        name: "get_current_weather",
        description: "Get the current weather in a given location",
        schema: Zod.object({
                location: Zod.string().describe('The city and state, e.g. San Francisco, CA'),
                unit: Zod.enum(["celsius", "fahrenheit"]).optional().describe('The unit of the temperature'),
        }),
        func: async ({ location, unit = 'celsius' }) => {
                const answerJson = {
                        location: location,
                        temperature: "72",
                        unit: unit,
                        forecast: ["sunny", "windy"],
                }
                return JSON.stringify(answerJson)
        }
})
tools.push(weatherTool)

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Init openai
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

const llm = new ChatOpenAI({
	// modelName: "gpt-3.5-turbo-1106",
	modelName: "gpt-4",
	temperature: 0,
	// verbose: true,
});


// Create the _promptTemplate
const chatPromptTemplate = ChatPromptTemplate.fromMessages([
	["system", systemMessage],
	new MessagesPlaceholder("chat_history"),
	["human", "{input}"],
	new MessagesPlaceholder("agent_scratchpad"),
]);


// create the agent
const agent = await createOpenAIToolsAgent({
	llm,
	tools,
	prompt: chatPromptTemplate,
});

// create the agent executor
const agentExecutor = new AgentExecutor({
	agent,
	tools,
});

const messageHistory = new ChatMessageHistory();

const agentWithChatHistory = new RunnableWithMessageHistory({
	runnable: agentExecutor,
	// This is needed because in most real world scenarios, a session id is needed per user.
	// It isn't really used here because we are using a simple in memory ChatMessageHistory.
	getMessageHistory: (_sessionId) => messageHistory,
	inputMessagesKey: "input",
	historyMessagesKey: "chat_history",
});

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Display start message
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

// display start message
const startMessage = `
Hello, today i will be your assistant. How can i help you about the weather in various location in the world ? \
(this is just a demo, so the weather is always the same)

To exit, just press ${CliColor.bold('ENTER')} key.
`

// display start message
console.log(startMessage)

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	main loop
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////


while (true) {
	// add the question to the user
	console.log()
	// console.log(CliColor.cyan('How can i help you ?'))
	let userInput = await readline.question(CliColor.green('>> '))
	userInput = userInput.trim()

	// if userInput is empty, considere that as the user willing to exit
	if (userInput === '') break

	// display a spinner
	textSpinner.start()
	// run the agentExecutor
	const responseMessage = await agentWithChatHistory.invoke({
		input: userInput,
	}, {
		// This is needed because in most real world scenarios, a session id is needed per user.
		// It isn't really used here because we are using a simple in memory ChatMessageHistory.
		configurable: {
			sessionId: "foo",
		},
	});
	// hide the spinner
	textSpinner.stop()

	// display content is there is any
	if (responseMessage?.output) {
		debug(`OpenAI response - content "${responseMessage.output}"`)

		console.log(' ')
		// console.log(`${CliColor.cyan('Answer for user')}: ${responseMessage.content.trim()}`)
		console.log(`${CliColor.magentaBright(responseMessage.output.trim())}`)
	}
}

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	handle exit
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

// display exit message
console.log('Bye.')

// close readline
readline.close()

// save readline history 
// @ts-ignore
await Fs.promises.writeFile(readlineHistoryPath, JSON.stringify(readline.history, null, '\t'), 'utf-8')