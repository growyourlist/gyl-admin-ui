export interface WaitStep {
	type: 'wait';
	tagReason?: string;
	runNextIn?: number;
	nextAction?: string;
}

export interface EmailStep {
	type: 'send email';
	templateId: string;
	tagReason?: string;
	tagOnOpen?: string;
	tagOnClick?: string;
	nextAction?: string;
	runNextIn?: number;
}

export interface ChoiceStep {
	type: 'make choice based on tag';
	tagReason?: string;
	tagToCheck?: string;
	yesAction?: string;
	noAction?: string;
}

export interface UnsubscribeStep {
	type: 'unsubscribe';
	tagReason?: string;
}

export interface Autoresponder {
	autoresponderId: string;
	defaultTagReason?: string;
	steps: {
		[key: string]: WaitStep | EmailStep | ChoiceStep | UnsubscribeStep;
	}
}
