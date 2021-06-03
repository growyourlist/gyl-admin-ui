import { Elm, firstBySelector, HSHElement } from "../common/hsh/hsh";

export class JoinedAfterControl {
	private joinedAfterContainer?: HSHElement = null;
	private dateElement?: HSHElement = null;
	private timeElement?: HSHElement = null;
	private validationMessage?: HSHElement = null;
	private utcTimeElement?: HSHElement = null;

	constructor(selector: string) {
		this.joinedAfterContainer = firstBySelector(selector);
		if (!this.joinedAfterContainer) {
			return;
		}
		this.dateElement = this.joinedAfterContainer.query('[type="date"]');
		this.timeElement = this.joinedAfterContainer.query('[type="time"]');
		this.validationMessage = this.joinedAfterContainer.query('#joined-after-validation');
		this.utcTimeElement = this.joinedAfterContainer.query('#joined-after-utc-time');
		this.dateElement.on(['change', 'keyup'], () => {
			this.validate();
			this.toggleTimeElement();
			this.updateUtcTimeDisplay();
		});
		this.timeElement.on(['change', 'keyup'], () => {
			this.validate();
			this.updateUtcTimeDisplay();
		})
	}

	toggleTimeElement() {
		if (this.dateElement.value) {
			this.timeElement.enable();
		} else {
			this.timeElement.value = '';
			this.timeElement.disable();
		}
	}

	updateUtcTimeDisplay() {
		this.utcTimeElement.clear()
		if (this.getIsValid()) {
			this.utcTimeElement.append(new Elm(
				'span', `UTC time: ${new Date(this.getJoinedAfter()).toISOString()}`
			));
		} else {
			this.utcTimeElement.append([
				new Elm('span', 'UTC time: '),
				new Elm('em', '<Date and time not specified>')
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
				text: 'Please enter a valid UTC time by setting both the date and hours',
				class: 'm-t-0p5',
				attrs: {
					'style': 'color:darkred;font-size:.85em'
				}
			}))
		}
	}

	getIsValid(): boolean {
		if (!this.dateElement?.value) {
			return true;
		}
		const joinedAfter = this.getJoinedAfter();
		return typeof joinedAfter === 'number';
	}

	getJoinedAfter(): number | undefined {
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
		const timestamp = Date.parse(`${
			this.dateElement.value
		}T${
			this.timeElement.value
		}`);
		if (isNaN(timestamp)) {
			return undefined;
		}
		return timestamp;
	}
}
