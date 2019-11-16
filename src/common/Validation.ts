/** Interface for specifying validation rules and messages */
export interface Validation {
	required?: {
		rule: boolean
		message: string
	}
	maxLength?: {
		rule: number
		message: string
		autoCut?: boolean
	}
	pattern?: {
		rule: RegExp
		message: string
	}
	email?: {
		message: string
	}
}
