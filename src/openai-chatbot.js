// node imports
import ReadlinePromises from "readline/promises"
import Fs from 'fs'
import Path from 'path'

// 3rd party imports
import CliColor from "cli-color"
import OpenAi from 'openai'


// local imports
import TextSpinner from "./text-spinner.js";

// MyDebug - setup a debug log function
import Debug from 'debug'
const debug = Debug('openai-chatbot')

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

// NOTE: trick to have __dirname available in ESM modules - https://blog.logrocket.com/alternatives-dirname-node-js-es-modules/#how-does-getting-dirname-back-work
import * as url from 'url';
const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

const textSpinner = new TextSpinner()

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	
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

// display start message
const startMessage = `
Hello, today i will be your assistant. How can i help you about the weather in various location in the world ?
(this is just a demo, so the weather is always the same)

To exit, just press ${CliColor.bold('ENTER')} key.
`

const functionCallbacks = {
	/**
	 * @param {object} dummyArg 
	 * @param {string} dummyArg.location 
	 * @param {'celsius'|'fahrenheit'} dummyArg.unit 
	 */
	get_current_weather: async ({ location, unit = 'celsius' }) => {
		const answerJson = {
			location: location,
			temperature: "72",
			unit: unit,
			forecast: ["sunny", "windy"],
		}
		return JSON.stringify(answerJson)
	}
}

/**
 * @type {OpenAi.Chat.Completions.ChatCompletionCreateParams.Function[]}
 */
const functionSchemas = [
	{
		name: "get_current_weather",
		description: "Get the current weather in a given location",
		parameters: {
			type: "object",
			properties: /** @type {any} */({
				location: {
					type: "string",
					description: "The city and state, e.g. San Francisco, CA",
				},
				unit: { "type": "string", "enum": ["celsius", "fahrenheit"] },
			}),
			required: ["location"],
		},
	}
]

const systemMesssage = `You are a helpful assistant. You are helping a user to get the current weather in a given location.`

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

debug('Global functionSchemas: ', JSON.stringify(functionSchemas, null, '\t'))

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

const openAi = new OpenAi({
	apiKey: process.env['OPENAI_API_KEY'], // This is the default and can be omitted
});

/**
 * @type {OpenAi.Chat.Completions.ChatCompletionMessageParam[]}
 */
const chatMessages = [
	{ role: "system", content: systemMesssage },
]

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	main loop
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

// display start message
console.log(startMessage)

while (true) {
	const latestMessage = chatMessages[chatMessages.length - 1]
	if (latestMessage.role === 'function') {
		// do nothing - latest message is a function response
	} else {
		// add the question to the user
		console.log()
		console.log(CliColor.cyan('How can i help you ?'))
		let userInput = await readline.question(CliColor.green('>> '))
		userInput = userInput.trim()

		// if userInput is empty, considere that as the user willing to exit
		if (userInput === '') break

		chatMessages.push({
			role: "user",
			content: userInput,
		})
	}

	debug(`OpenAI createChatCompletion - chatMessages: ${JSON.stringify(chatMessages, null, '\t')}`)

	// display a spinner
	textSpinner.start()
	// run the chain
	const callResult = await openAi.chat.completions.create({
		model: "gpt-3.5-turbo-1106",
		messages: chatMessages,
		functions: functionSchemas,
		
	});

	// debug(callResult.data.choices[0].message);
	const responseMessage = callResult.choices[0].message
	debug({ responseMessage })

	if (responseMessage) {
		chatMessages.push(responseMessage)
	}


	if (responseMessage?.function_call) {
		// call the function
		const functionName = responseMessage.function_call.name || ''
		let functionArgs = null
		try {
			functionArgs = responseMessage.function_call.arguments ? JSON.parse(responseMessage.function_call.arguments) : {}
		} catch (e) {
			debugger
		}
		console.assert(functionName in functionCallbacks, `Unknown function name: ${functionName}`)

		debug(`OpenAI response - Function ${functionName} requested by OpenAI api`)
		debug(`Function ${functionName} - args: ${JSON.stringify(functionArgs)}`)

		const functionToCall = functionCallbacks[functionName]
		const functionResponse = await functionToCall(functionArgs)

		debug(`Function ${functionName} - response: ${JSON.stringify(functionResponse)}`)

		// push a message for the function response
		chatMessages.push({
			"role": "function",
			"name": functionName,
			"content": functionResponse,
		})
	}

	// hide the spinner
	textSpinner.stop()

	// display content is there is any
	if (responseMessage?.content) {
		debug(`OpenAI response - content "${responseMessage.content}"`)

		console.log(' ')
		// console.log(`${CliColor.cyan('Answer for user')}: ${responseMessage.content.trim()}`)
		console.log(`${CliColor.magentaBright(responseMessage.content.trim())}`)
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
