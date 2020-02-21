
/**
 * Abstract data structure for simplified representation of HTML element data.
 */
export class Elm {
	public type?: string
	public attrs?: { [key: string]: string | boolean }
	public events?: { [key: string]: (ev: any) => any }
	public options?: string[]
	public value?: string
	public content?: HTMLElement | Elm | string |
		Array<HTMLElement | Elm | string>

	constructor(
		opts: {
			type?: keyof HTMLElementTagNameMap
			attrs?: { [key: string]: string | boolean }
			events?: { [key: string]: (ev: any) => any }
			options?: string[]
			value?: string
			text?: string
			class?: string
			id?: string
		} | keyof HTMLElementTagNameMap | (() => {
			type?: keyof HTMLElementTagNameMap
			attrs?: { [key: string]: string | boolean }
			events?: { [key: string]: (ev: any) => any }
			options?: string[]
			value?: string
			text?: string
			class?: string
			id?: string
		}),
		content?: HTMLElement | Elm | string | Array<HTMLElement | Elm | string>
	) {

		if (typeof opts === 'string') {
			this.type = opts
			this.content = content
		}
		else {
			let realOps = typeof opts === 'function' ? opts() : opts;
			if (
				(typeof realOps.text !== 'undefined') &&
				(typeof content !== 'undefined')
			) {
				throw new Error(
					'Either opts.text or content parameters can be set but not both.'
				)
			}
			this.type = realOps.type
			this.attrs = realOps.attrs
			if (realOps.class) {
				if (this.attrs) {
					this.attrs['class'] = `${realOps.class} ${
						(this.attrs['class'] || '')
					}`.trim();
				}
				else {
					this.attrs = { 'class': realOps.class };
				}
			}
			if (realOps.id) {
				if (this.attrs) {
					if (this.attrs['id']) {
						throw new Error('Id can only be set as attribute or property but '
						+ 'not both')
					}
					this.attrs['id'] = realOps.id;
				}
				else {
					this.attrs = { 'id': realOps.id };
				}
			}
			this.events = realOps.events
			this.options = realOps.options
			this.value = realOps.value
			if (realOps.text) {
				this.content = realOps.text
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
				if (typeof this.attrs[attr] === 'boolean' && this.attrs[attr]) {
					elm.setAttribute(attr, 'true')
				}
				else if (typeof this.attrs[attr] === 'string') {
					elm.setAttribute(attr, this.attrs[attr] as string)
				}
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
				attrs: { selected: option === this.value }
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
