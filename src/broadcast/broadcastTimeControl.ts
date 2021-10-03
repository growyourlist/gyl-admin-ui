import { Elm, firstBySelector, HSHElement } from "../common/hsh/hsh";

export class BroadcastTimeControl {
	private broadcastTimeContainer?: HSHElement = null;
	private dateElement?: HSHElement = null;
	private timeElement?: HSHElement = null;
	private validationMessage?: HSHElement = null;
	private utcTimeContainer?: HSHElement = null;
	private subscriberTimeContainer?: HSHElement = null;
	private utcTime?: HSHElement = null;
	private subscriberTime?: HSHElement = null;
	private datetimeContext?: HSHElement = null;

	constructor(selector: string) {
		this.broadcastTimeContainer = firstBySelector(selector);
		if (!this.broadcastTimeContainer) {
			return;
		}
		this.dateElement = this.broadcastTimeContainer.query('#start-send-at-date');
		this.timeElement = this.broadcastTimeContainer.query('#start-send-at-time');
		this.validationMessage = this.broadcastTimeContainer.query('#broadcast-time-validation');
		this.utcTimeContainer = this.broadcastTimeContainer.query('#utc-time-container');
		this.utcTime = this.broadcastTimeContainer.query('#utc-time');
		this.subscriberTimeContainer = this.broadcastTimeContainer.query('#subscriber-time-container');
		this.subscriberTime = this.broadcastTimeContainer.query('#subscriber-time');
		this.datetimeContext = this.broadcastTimeContainer.query('#datetime-context');
		this.dateElement.on(['change', 'keyup', 'mouseup'], () => {
			this.validate();
			this.updateUtcTimeDisplay();
			this.updateSubscriberTimeDisplay();
		});
		this.timeElement.on(['change', 'keyup', 'mouseup'], () => {
			this.validate();
			this.updateUtcTimeDisplay();
			this.updateSubscriberTimeDisplay();
		});
		this.datetimeContext.on(['change'], () => {
			this.toggleBroadcastTimeDisplay();
			this.validate();
			this.updateUtcTimeDisplay();
			this.updateSubscriberTimeDisplay();
		});
		this.toggleBroadcastTimeDisplay();
		this.updateSubscriberTimeDisplay();
		this.updateUtcTimeDisplay();
	}

	updateUtcTimeDisplay() {
		this.utcTime.clear()
		if (this.getIsValid()) {
			if (this.getBroadcastTime()) {
				this.utcTime.text = new Date(this.getBroadcastTime()).toISOString();
			} else {
				this.utcTime.text = 'Now';
			}
		} else {
			this.utcTime.append([
				new Elm('em', '<Date and time not specified or invalid>')
			])
		}
	}

	getSubscriberTimeDateString() {
		return `${this.dateElement.value}T${this.timeElement.value}`;
	}

	updateSubscriberTimeDisplay() {
		this.subscriberTime.clear()
		if (this.getIsValid()) {
			this.subscriberTime.text = `${
				this.dateElement.value
			} at ${
				this.timeElement.value
			} in the subscriber's timezone`
		} else {
			this.subscriberTime.append([
				new Elm('em', '<Date and time not specified or invalid>')
			])
		}
	}

	validate() {
		if (this.getIsValid()) {
			this.dateElement.style.removeProperty('border-color');
			this.timeElement.style.removeProperty('border-color');
			this.timeElement.style.removeProperty('border-width');
			this.validationMessage.clear();
		} else {
			this.dateElement.style.setProperty('border-color', 'darkred');
			this.timeElement.style.setProperty('border-color', 'darkred');
			this.timeElement.style.setProperty('border-width', '2');
			this.validationMessage.clear();
			this.validationMessage.append(new Elm({
				type: 'strong',
				text: 'Please enter a valid broadcast time by setting both the date and hours',
				class: 'm-t-0p5',
				attrs: {
					'style': 'color:darkred;font-size:.85em'
				}
			}))
		}
	}

	getIsValid(): boolean {
		if (this.datetimeContext.value === 'local time' && (!this.dateElement?.value || !this.timeElement?.value)) {
			return true;
		} else if (this.dateElement.value && this.timeElement.value) {
				return /^\d{4}-\d{2}-\d{2}$/.test(this.dateElement.value) &&
				/^\d{2}:\d{2}$/.test(this.timeElement.value)
		}
		return false;
	}

	toggleBroadcastTimeDisplay() {
		const context = this.datetimeContext.value;
		if (context === 'subscriber time') {
			this.utcTimeContainer.hide();
			this.subscriberTimeContainer.show();
		} else {
			this.utcTimeContainer.show();
			this.subscriberTimeContainer.hide();
		}
	}

	getBroadcastTimeContext(): 'utc' | 'subscriber' {
		const context = this.datetimeContext.value;
		if (context === 'local time') {
			// A bit confusing, but the user is looking at the broadcast screen in
			// their local timezone; however, the timestamp actually sent to the
			// server is a utc timestamp.
			return 'utc';
		} else if (context === 'subscriber time') {
			return 'subscriber';
		} else {
			return 'utc'
		}
	}

	getSubscriberBroadcastTime(): string | undefined {
		if (this.datetimeContext.value !== 'subscriber time') {
			return undefined;
		} else {
			return this.getSubscriberTimeDateString();
		}
	}

	getBroadcastTime(): number | undefined {
		if (this.datetimeContext.value === 'subscriber time') {
			return undefined;
		}
		if (
			typeof this.dateElement?.value !== 'string' ||
			this.dateElement?.value === ''
		) {
			return undefined;
		}
		if (
			typeof this.timeElement?.value !== 'string' ||
			this.timeElement?.value === ''
		) {
			return undefined;
		}
		if (this.dateElement.value.length < 10) {
			return undefined;
		}
		if (this.timeElement.value.length !== 5) {
			return undefined;
		}
		return Date.parse(`${this.dateElement.value
			}T${this.timeElement.value}`)
	}
}
