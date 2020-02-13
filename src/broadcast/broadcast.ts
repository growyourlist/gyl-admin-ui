import { ListsControl } from './listsControl';
import { TagsControl } from './tagsControl';
import { PropertiesControl } from './propertiesControl';
import { InteractionsControl } from './interactionsControl';
import { onDOMReady, byId, Elm } from '../common/hsh/hsh';
import { SubscriberCountControl } from './subscriberCountControl';
import { apiRequest } from '../common/apiRequest';

const getInteractionString: (interaction: {
	emailDate: string;
	templateId: string;
	click?: boolean;
	open?: boolean;
	received?: boolean;
}) => string = interaction => {
	if (typeof interaction.received !== 'undefined') {
		return `${interaction.received ? 'received' : 'did not receive'} ${
			interaction.templateId
		} (sent ${interaction.emailDate})`;
	}
	let output = '';
	if (typeof interaction.open !== 'undefined') {
		output += `${interaction.open ? 'opened' : 'did not open'} and `;
	}
	if (typeof interaction.click !== 'undefined') {
		output += `${interaction.click ? 'clicked' : 'did not click'} and `;
	}
	output = output.substring(0, output.length - 4);
	output += `${interaction.templateId} (sent ${interaction.emailDate})`;

	return output;
};

onDOMReady(async () => {
	try {
		// Set up the controls
		const broadcastAudience = byId('broadcast-audience');
		const broadcastEmailContainer = byId('broadcast-email-container');
		const broadcastTimeContainer = byId('broadcast-time-container');
		const templateName = byId('template-name');
		const listsControl = new ListsControl('#lists-container');
		listsControl.loadLists();
		const tagsControl = new TagsControl('#tags-container');
		const excludeTagsControl = new TagsControl('#exclude-tags-container');
		const propertiesControl = new PropertiesControl(
			'#subscriber-properties-filter-container'
		);
		const interactionsControl = new InteractionsControl(
			'#subscriber-interactions-container'
		);
		interactionsControl.loadEmailHistory();
		const countControl = new SubscriberCountControl(
			'#subscriber-count-container',
			listsControl,
			tagsControl,
			excludeTagsControl,
			propertiesControl,
			interactionsControl
		);

		const hideInputControls = () => {
			broadcastAudience.hide();
			countControl.hide();
			broadcastEmailContainer.hide();
			broadcastTimeContainer.hide();
		};

		const showInputControls = () => {
			broadcastAudience.show();
			countControl.show();
			broadcastEmailContainer.show();
			broadcastTimeContainer.show();
		};

		const startDateElm = byId('start-send-at-date');
		const startTimeElm = byId('start-send-at-time');
		const utcTimeElm = byId('utc-time');
		const updateUTCTime = () => {
			const now = new Date();
			const startDate =
				startDateElm.valueAsNumber ||
				Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
			const startTime = startTimeElm.valueAsNumber || 0;
			const targetDatetime = new Date(
				startDate + startTime + now.getTimezoneOffset() * 60 * 1000
			);
			if (targetDatetime < now) {
				return (utcTimeElm.text = 'now');
			}
			utcTimeElm.text = targetDatetime.toISOString();
		};

		startDateElm.on(['keyup', 'change'], updateUTCTime);
		startTimeElm.on(['keyup', 'change'], updateUTCTime);
		if (startTimeElm.valueAsNumber || startDateElm.valueAsNumber) {
			updateUTCTime()
		}
		const getSendTimeValue = (): number => {
			const runAtString = utcTimeElm.text.trim();
			if (!runAtString || runAtString === 'now') {
				return null;
			}
			let runAtDate = null;
			try {
				runAtDate = new Date(runAtString);
				if (!runAtDate.valueOf()) {
					return null;
				}
			} catch (ex) {
				return null;
			}
			return runAtDate.valueOf();
		};

		const getSendTimeString = (sendTimeValue?: number): string => {
			if (!sendTimeValue) {
				return 'right now';
			}
			return `${new Date(sendTimeValue).toUTCString()} (${new Date(
				sendTimeValue
			).toLocaleDateString()} ${new Date(
				sendTimeValue
			).toLocaleTimeString()} local time)`;
		};

		const sendButton = byId('send-broadcast-button');
		const confirmationDetailsBox = byId('broadcast-confirmation-details');
		const confirmAndSendButton = byId('confirm-send-broadcast-button');
		const cancelSendButton = byId('cancel-send-button');
		const sendStatusMessage = byId('send-status-message');

		sendButton.on('click', () => {
			sendButton.hide();
			hideInputControls();
			const broadcastData: {
				templateName: string;
				runAt: number | null;
				list: string;
				tags: string[];
				excludeTags: string[];
				properties: { [key: string]: string };
				interactions: {
					emailDate: string;
					templateId: string;
					click?: boolean;
					open?: boolean;
					received?: boolean;
				}[];
			} = {
				templateName: templateName.value,
				runAt: getSendTimeValue(),
				list: listsControl.getList(),
				tags: tagsControl.getTags(),
				excludeTags: excludeTagsControl.getTags(),
				properties: propertiesControl.getProperties(),
				interactions: interactionsControl.getInteractions(),
			};
			const confirmationMessage: Elm[] = [
				new Elm('span', `Send email: ${templateName.value}`),
				new Elm('br'),
				new Elm('span', `At time: ${getSendTimeString(broadcastData.runAt)}`),
				new Elm('br'),
			];
			const hasFilterData =
				broadcastData.tags.length ||
				broadcastData.excludeTags.length ||
				Object.keys(broadcastData.properties).length ||
				broadcastData.interactions.length;
			if (hasFilterData) {
				confirmationMessage.push(
					new Elm('span', `To list: ${listsControl.getList()}`)
				);
				confirmationMessage.push(new Elm('br'));
				confirmationMessage.push(new Elm('span', 'Filter by subscribers:'));
				confirmationMessage.push(new Elm('br'));
				if (broadcastData.tags.length) {
					confirmationMessage.push(
						new Elm(
							'span',
							`  who have the tags: ${broadcastData.tags.join(' and ')}`
						)
					);
					confirmationMessage.push(new Elm('br'));
				}
				if (broadcastData.excludeTags.length) {
					confirmationMessage.push(
						new Elm(
							'span',
							`  ${
								broadcastData.tags.length
									? 'and who do not have the tags'
									: 'who do not have the tags'
							}: ${broadcastData.excludeTags.join(' or ')}`
						)
					);
					confirmationMessage.push(new Elm('br'));
				}
				if (Object.keys(broadcastData.properties).length) {
					confirmationMessage.push(
						new Elm(
							'span',
							`  ${
								broadcastData.excludeTags.length || broadcastData.tags.length
									? 'and who have the properties'
									: 'who have the properties'
							}:`
						)
					);
					confirmationMessage.push(new Elm('br'));
					for (let prop in broadcastData.properties) {
						confirmationMessage.push(
							new Elm('span', `    ${prop}: ${broadcastData.properties[prop]}`)
						);
						confirmationMessage.push(new Elm('br'));
					}
				}
				if (broadcastData.interactions.length) {
					confirmationMessage.push(
						new Elm(
							'span',
							`  ${
								broadcastData.tags.length ||
								broadcastData.excludeTags.length ||
								Object.keys(broadcastData.properties).length
									? 'and who had the following interactions with previous emails: '
									: 'who had the following interactions with previous emails: '
							}`
						)
					);
					confirmationMessage.push(new Elm('br'));
					broadcastData.interactions.forEach(interaction => {
						confirmationMessage.push(
							new Elm('span', `    ${getInteractionString(interaction)}`)
						);
						confirmationMessage.push(new Elm('br'));
					});
				}
			} else {
				confirmationMessage.push(
					new Elm(
						'span',
						`To all subscribers on the list: ${listsControl.getList()}`
					)
				);
			}
			confirmationMessage.push(new Elm('span'));
			confirmationDetailsBox.append([
				new Elm(
					'p',
					'You are about the send a broadcast using the following settings:'
				),
				new Elm('div', new Elm('pre', confirmationMessage)),
			]);

			const confirmAndSend = async () => {
				try {
					confirmAndSendButton.disable()
					cancelSendButton.disable()
					await apiRequest('/broadcast', {
						method: 'POST',
						body: JSON.stringify(broadcastData),
					});
					confirmAndSendButton.removeEventListener('click', confirmAndSend);
					confirmAndSendButton.hide()
					cancelSendButton.hide()
					sendStatusMessage.clear()
					sendStatusMessage.show()
					sendStatusMessage.append(new Elm({
						type: 'p',
						attrs: { 'class': 'status success' },
						text: 'Broadcast triggered',
					}))
				} catch (err) {
					console.error(err);
					sendStatusMessage.clear()
					sendStatusMessage.show()
					sendStatusMessage.append(new Elm({
						type: 'p',
						attrs: { 'class': 'status error' },
						text: `Error sending broadcast: ${err.message}`,
					}))
				}
				finally {
					confirmAndSendButton.enable()
					cancelSendButton.enable()
				}
			};

			confirmAndSendButton.on('click', confirmAndSend);

			cancelSendButton.on('click', () => {
				confirmAndSendButton.removeEventListener('click', confirmAndSend);
				showInputControls();
				confirmationDetailsBox.clear();
				sendButton.show();
				confirmAndSendButton.hide();
				cancelSendButton.hide();
			});

			confirmAndSendButton.show();
			cancelSendButton.show();
		});
	} catch (err) {
		console.error(err);
	}
});
