/**
 * a class which make text spin
 */
export default class TextSpinner{
	constructor(){
		this._intervalId = null
		this._counter = 0
		this._charSequence = ['|','/','-','\\']
	}
	destroy(){
		this.stop()
	}

	start(){
		// Check if the interval ID is null
		console.assert(this._intervalId===null)
		this._displayChar()
		this._intervalId = setInterval(()=>{
			this._displayChar()
		}, 100)
	}

	stop(){
		if(this._intervalId !== null){
			clearInterval(this._intervalId)
			this._intervalId = null
		}
	}

	_displayChar(){
		const text = this._charSequence[this._counter]+'\r'
		process.stdout.write(text)
		this._counter+=1
		this._counter %= this._charSequence.length
	}
}
