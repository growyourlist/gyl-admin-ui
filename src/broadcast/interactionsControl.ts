import {
	byId,
	HSHElement,
	Elm,
	bySelector,
	firstBySelector,
} from '../common/hsh/hsh';
import { apiRequest } from '../common/apiRequest';

export class InteractionsControl {
	private interactionsContainer: HSHElement;
	private emailHistorySelect: HSHElement;
	private emailHistoryDate: HSHElement;
	private interactionsList: HSHElement;

	constructor(selector: string) {
		this.interactionsContainer = firstBySelector(selector);
		this.emailHistorySelect = this.interactionsContainer.query(
			'#email-history-select'
		);
		this.emailHistoryDate = this.interactionsContainer.query(
			'#interaction-email-date'
		);
		this.interactionsList = this.interactionsContainer.query(
			'#interactions-list'
		);
	}

	hide() {
		this.interactionsContainer.hide();
	}

	show() {
		this.interactionsContainer.show();
	}

	updateSendDates(templateHistory: { from: string; to: string }[]) {
		this.emailHistoryDate.clear();
		const sendDates: string[] = [];
		templateHistory.forEach(dateRange => {
			const firstDateParts = dateRange.from.match(/(\d{4})-(\d{2})-(\d{2})/);
			const year = parseInt(firstDateParts[1]);
			const month = parseInt(firstDateParts[2]) - 1;
			const day = parseInt(firstDateParts[3]);
			const innerDate = new Date(Date.UTC(year, month, day));
			let movingUTCDateString = innerDate.toISOString().substring(0, 10);
			while (movingUTCDateString <= dateRange.to) {
				sendDates.push(movingUTCDateString);
				innerDate.setUTCDate(innerDate.getUTCDate() + 1);
				movingUTCDateString = innerDate.toISOString().substring(0, 10);
			}
		});
		sendDates.reverse();
		sendDates.forEach((sendDate, i) => {
			const attrs: { value: string; selected?: string } = { value: sendDate };
			if (i === 0) {
				attrs.selected = '';
			}
			this.emailHistoryDate.append(
				new Elm({
					type: 'option',
					text: sendDate,
					attrs,
				})
			);
		});
	}

	async loadEmailHistory() {
		const historyRes = await apiRequest('/email-history');
		const emailHistory = await historyRes.json();
		const templateIds = Object.keys(emailHistory);
		templateIds.sort((a, b) =>
			a.localeCompare(b, undefined, { sensitivity: 'base' })
		);
		let templateHistory = null;
		templateIds.forEach((templateId, i) => {
			const attrs: {
				value: string;
				selected?: string;
				'data-history'?: string;
			} = { value: templateId };
			if (i === 0) {
				attrs.selected = '';
				templateHistory = emailHistory[templateId];
			}
			attrs['data-history'] = JSON.stringify(emailHistory[templateId]);
			const option = new Elm({
				type: 'option',
				text: templateId,
				attrs,
			});
			this.emailHistorySelect.append(option);
		});
		if (templateHistory) {
			this.updateSendDates(templateHistory);
		}
		this.emailHistorySelect.on('change', event => {
			const select = event.target as HTMLSelectElement;
			const history = JSON.parse(
				select.options[select.selectedIndex].dataset.history
			);
			this.updateSendDates(history);
		});

		const receiveStateInputs = bySelector('[name="interaction-receive"]');
		const otherInteractionInputs = bySelector(
			'[name="interaction-click"]'
		).concat(bySelector('[name="interaction-open"]'));
		const clearReceiveStateContainer = byId('clear-receive-button-container');
		receiveStateInputs.forEach(i => {
			i.checked = false;
			i.on('click', () => {
				clearReceiveStateContainer.show();
				otherInteractionInputs.forEach(j => {
					j.checked = false;
					j.disable();
				});
			});
		});
		byId('clear-receive-button').on('click', () => {
			clearReceiveStateContainer.hide();
			otherInteractionInputs.forEach(i => {
				i.enable();
			});
			receiveStateInputs.forEach(i => {
				i.checked = false;
			});
		});
		otherInteractionInputs.forEach(i => {
			i.checked = false;
		});

		byId('add-interaction-button').on('click', () => {
			const interactionDate = this.emailHistoryDate.value;
			const interactionEmail = this.emailHistorySelect.value;
			if (!(interactionDate && interactionEmail)) {
				return;
			}
			const click = firstBySelector(
				'[name="interaction-click"][value="did-click"]'
			).checked;
			const notClick = firstBySelector(
				'[name="interaction-click"][value="did-not-click"]'
			).checked;
			const open = firstBySelector(
				'[name="interaction-open"][value="did-open"]'
			).checked;
			const notOpen = firstBySelector(
				'[name="interaction-open"][value="did-not-open"]'
			).checked;
			const receive = firstBySelector(
				'[name="interaction-receive"][value="did-receive"]'
			).checked;
			const notReceive = firstBySelector(
				'[name="interaction-receive"][value="did-not-receive"]'
			).checked;
			let emailStatus = '';
			if (click) {
				emailStatus += 'clicked and ';
			}
			if (notClick) {
				emailStatus += 'not clicked and ';
			}
			if (open) {
				emailStatus += 'opened and ';
			}
			if (notOpen) {
				emailStatus += 'not opened and ';
			}
			if (receive) {
				emailStatus += 'received and ';
			}
			if (notReceive) {
				emailStatus += 'not received and ';
			}
			if (!emailStatus) {
				// Not a valid interaction
				return;
			}
			emailStatus =
				emailStatus && emailStatus.substring(0, emailStatus.length - 5);
			if (!emailStatus) {
				emailStatus = 'any interaction';
			}
			if (this.interactionsList.query('.no-interactions')) {
				this.interactionsList.clear();
			}
			const interactionsList = this.interactionsList
			this.interactionsList.append(
				new Elm(
					{
						type: 'span',
						attrs: { class: 'interaction' },
					},
					[
						new Elm({
							type: 'span',
							attrs: { class: 'interaction-date' },
							text: interactionDate,
						}),
						new Elm('span', ' '),
						new Elm({
							type: 'span',
							attrs: { class: 'interaction-email' },
							text: interactionEmail,
						}),
						new Elm('span', ' '),
						new Elm({
							type: 'span',
							attrs: { class: 'interaction-status' },
							text: emailStatus,
						}),
						new Elm('span', ' '),
						new Elm({
							type: 'button',
							text: 'Remove',
							attrs: { class: 'button minor m-l-0p3 inline' },
							events: {
								click: event => {
									new HSHElement(event.target).parent.removeSelf();
									if (interactionsList.isEmpty()) {
										this.interactionsList.append(new Elm({
											type: 'em',
											attrs: { 'class': 'no-interactions' },
											text: '<none>',
										}))
									}
								},
							},
						}),
					]
				)
			);
		});
	}

	getInteractions(): {
		emailDate: string
		templateId: string
		click?: boolean
		open?: boolean
		received?: boolean
	}[] {
		const interactions: {
			emailDate: string
			templateId: string
			click?: boolean
			open?: boolean
			received?: boolean
		}[] = [];
		this.interactionsList.queryAll('.interaction').forEach(elm => {
			const interaction: {
				emailDate: string;
				templateId: string;
				click?: boolean;
				open?: boolean;
				received?: boolean;
			} = {
				emailDate: elm.query('.interaction-date').text,
				templateId: elm.query('.interaction-email').text,
			};
			const statusText = elm.query('.interaction-status').text;
			if (statusText.indexOf('not clicked') >= 0) {
				interaction.click = false;
			} else if (statusText.indexOf('clicked') >= 0) {
				interaction.click = true;
			}
			if (statusText.indexOf('not opened') >= 0) {
				interaction.open = false;
			} else if (statusText.indexOf('opened') >= 0) {
				interaction.open = true;
			}
			if (statusText.indexOf('not received') >= 0) {
				interaction.received = false;
			} else if (statusText.indexOf('received') >= 0) {
				interaction.received = true;
			}
			interactions.push(interaction);
		});
		return interactions;
	}
}
