/**
 * Shorthand for document.getElementById, returning HSHElement
 * @param elementId 
 */
const byId = (elementId: string): HSHElement | null => {
    const element = document.getElementById(elementId)
    if (!element) {
        return null
    }
    return new HSHElement(element)
}

/**
 * Shorthand for document.querySelector, returning HSHElement
 * @param selector 
 */
const firstBySelector = (selector: string): HSHElement | null => {
    const element = document.querySelector(selector)
    console.log(element)
    if (!element) {
        return null
    }
    if (!(element instanceof HTMLElement)) {
        throw new Error(`HSHElement only works with HTMLElements. Attempted to `
        + `convert ${(<any>element).constructor.name}`)
    }
    return new HSHElement(element)
}

/**
 * Shorthand for calling a function when the DOM is ready.
 * @param callback 
 */
const onDOMReady = (callback: () => any): void => {
    if (document.readyState === 'complete' ||
        document.readyState === 'interactive'
    ) {
        return callback();
    }
    document.addEventListener('DOMContentLoaded', callback);
}

/**
 * Abstract data structure for simplified representation of HTML element data.
 */
export class Elm {
    text?: string
    attrs?: {
        [key: string]: string
    }
    events?: {
        [key: string]: (ev: any) => any
    }
    options?: string[]
    value?: string
    children?: HTMLElement[]
}

/**
 * Creates a new HTMLElement based on provided element definition data.
 * @param type 
 * @param elmDef 
 */
const newElm = <K extends keyof HTMLElementTagNameMap>(
    type: K,
    elmDef: Elm | (() => string) | string | null
): HTMLElementTagNameMap[K] => {
    const elm = document.createElement(type)
    if (!elmDef) {
        return elm
    }

    const def = typeof elmDef === 'function' ? elmDef() : elmDef
    if (typeof def === 'string') {
        elm.textContent = def
        return elm
    }

    if (def.text) {
        elm.textContent = def.text
    }
    if (def.attrs) {
        for (let attr in def.attrs) {
            elm.setAttribute(attr, def.attrs[attr])
        }
    }
    if (def.events) {
        for (let eventName in def.events) {
            elm.addEventListener(
                eventName, event => def.events[eventName](event)
            )
        }
    }
    if (type === 'select' && Array.isArray(def.options)) {
        def.options.forEach(option => elm.appendChild(newElm('option', {
            value: option,
            text: option
        })))
    }
    if (def.value && (
        elm instanceof HTMLInputElement ||
        elm instanceof HTMLTextAreaElement
    )) {
        elm.value = def.value
    }
    if (Array.isArray(def.children)) {
        for (let childElement of def.children) {
            elm.appendChild(childElement)
        }
    }
    return elm
}

/**
 * HTML shorthand element - a wrapper for HTMLElements with shorthand functions.
 */
export class HSHElement {

    /** The wrapped HTML element */
    _element: HTMLElement

    constructor(element: HTMLElement) {
        this._element = element
    }

    /** Returns the value of the element */
    get value(): string | null {
        if (this._element instanceof HTMLInputElement) {
            return (<HTMLInputElement>this._element).value
        }
        if (this._element instanceof HTMLTextAreaElement) {
            return (<HTMLTextAreaElement>this._element).value
        }
        return null
    }

    get style(): CSSStyleDeclaration {
        return this._element.style
    }

    get classList(): DOMTokenList {
        return this._element.classList
    }

    set text(value: string) {
        this._element.textContent = value
    }

    show(): void {
        this._element.style.display = ''
    }

    hide(): void {
        this._element.style.display = 'none'
    }

    disable(): void {
        this._element.setAttribute('disabled', '')
    }

    enable(): void {
        this._element.removeAttribute('disabled')
    }

    append(element: HTMLElement): HTMLElement {
        return this._element.appendChild(element)
    }

    /** Removes all child elements */
    clear(): void {
        while (this._element.lastChild) {
            this._element.removeChild(this._element.lastChild)
        }
    }

    /** Shorthand for addEventListener */
    aEL<K extends keyof HTMLElementEventMap>(
        type: K,
        listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any,
        options?: boolean | AddEventListenerOptions
    ): void {
        this._element.addEventListener(type, listener, options)
    }
}

export const hsh = {
    byId,
    firstBySelector,
    onDOMReady,
    newElm,
}
