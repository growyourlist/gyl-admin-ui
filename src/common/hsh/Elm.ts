
/**
 * Abstract data structure for simplified representation of HTML element data.
 */
export class Elm {
	public type?: string
	public attrs?: { [key: string]: string }
	public events?: { [key: string]: (ev: any) => any }
	public options?: string[]
	public value?: string
	public content?: HTMLElement | Elm | string |
		Array<HTMLElement | Elm | string>

	constructor(
		opts: {
			type?: keyof HTMLElementTagNameMap
			attrs?: { [key: string]: string }
			events?: { [key: string]: (ev: any) => any }
			options?: string[]
			value?: string
			text?: string
		} | keyof HTMLElementTagNameMap,
		content?: HTMLElement | Elm | string | Array<HTMLElement | Elm | string>
	) {

		if (typeof opts === 'string') {
			this.type = opts
			this.content = content
		}
		else {
			if (
				(typeof opts.text !== 'undefined') &&
				(typeof content !== 'undefined')
			) {
				throw new Error(
					'Either opts.text or content parameters can be set but not both.'
				)
			}
			this.type = opts.type
			this.attrs = opts.attrs
			this.events = opts.events
			this.options = opts.options
			this.value = opts.value
			if (opts.text) {
				this.content = opts.text
			}
			if (content) {
				this.content = content
			}
		}
	}

	public toHTMLElement(): HTMLElement {
		const elm = document.createElement(this.type)
		if (typeof this.content === 'string') {
			elm.textContent = this.content
		}
		if (Array.isArray(this.content)) {
			this.content.forEach(item => {
				if (item instanceof HTMLElement) {
					elm.appendChild(item)
					return
				}
				if (item instanceof Elm) {
					elm.appendChild(item.toHTMLElement())
					return
				}
				if (typeof item === 'string') {
					const textNode = document.createTextNode(item)
					elm.appendChild(textNode)
				}
			})
		}
		else if (this.content instanceof HTMLElement) {
			elm.appendChild(this.content)
		}
		else if (this.content instanceof Elm) {
			elm.appendChild(this.content.toHTMLElement())
		}
		if (this.attrs) {
			for (let attr in this.attrs) {
				elm.setAttribute(attr, this.attrs[attr])
			}
		}
		if (this.events) {
			for (let eventName in this.events) {
				elm.addEventListener(eventName, this.events[eventName])
			}
		}
		if (this.type === 'select' && Array.isArray(this.options)) {
			this.options.forEach(option => elm.appendChild(new Elm({
				type: 'option',
				value: option,
				text: option,
			}).toHTMLElement()))
		}
		if (this.value && (
			elm instanceof HTMLInputElement ||
			elm instanceof HTMLTextAreaElement
		)) {
			elm.value = this.value
		}
		return elm
	}
}
