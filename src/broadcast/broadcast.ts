import { ListsControl } from './listsControl';
import { TagsControl } from './tagsControl';
import { PropertiesControl } from './propertiesControl';
import { InteractionsControl } from './interactionsControl';
import { onDOMReady, byId, Elm, HSHElement } from '../common/hsh/hsh';
import { SubscriberCountControl } from './subscriberCountControl';
import { apiRequest } from '../common/apiRequest';
import { loadTemplates } from '../common/loadTemplates';
import { createTemplateListElm } from '../common/createTemplateListElm';
import { InteractionWithAnyEmailControl } from './InteractionWithAnyEmailControl';
import { IgnoreConfirmedControl } from './IgnoreConfirmedControl';
import { WinningTypeControl } from './WinningTypeControl';
import { JoinedAfterControl } from './joinedAfterControl';

const getInteractionString: (interaction: {
	emailDate: string;
	templateId: string;
	click?: boolean;
	open?: boolean;
	received?: boolean;
}) => string = (interaction) => {
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
		let cachedTemplateList: { Name: string }[] = [];
		let isLoadingTemplates = true;
		loadTemplates((templates) => {
			isLoadingTemplates = false;
			cachedTemplateList = templates;
		});
		const broadcastAudience = byId('broadcast-audience');
		const broadcastEmailContainer = byId('broadcast-email-container');
		const broadcastTagsContainer = byId('broadcast-tags-container');
		const broadcastTimeContainer = byId('broadcast-time-container');
		const templateIdElm = byId('template-name');
		const templateListElm = byId('template-list');
		const broadcastValidationMessage = byId('broadcast-validation-message');
		const useTemplateButton = byId('select-template-button');
		const templateSelectionList = byId('template-selection-list');
		const listsControl = new ListsControl('#lists-container');
		listsControl.loadLists();
		const tagsControl = new TagsControl('#tags-container');
		const excludeTagsControl = new TagsControl('#exclude-tags-container');
		const joinedAfterControl = new JoinedAfterControl('#joined-after-container');
		const propertiesControl = new PropertiesControl(
			'#subscriber-properties-filter-container'
		);
		const interactionsControl = new InteractionsControl(
			'#subscriber-interactions-container'
		);
		interactionsControl.loadEmailHistory();
		const interactionWithAnyEmailControl = new InteractionWithAnyEmailControl(
			'#subscriber-interactions-with-any-email-container'
		);
		const ignoreConfirmedControl = new IgnoreConfirmedControl(
			'#ignore-confirmed-container'
		);
		const winningTypeControl = new WinningTypeControl(
			'#winning-type-container'
		);
		const countControl = new SubscriberCountControl(
			'#subscriber-count-container',
			listsControl,
			tagsControl,
			excludeTagsControl,
			joinedAfterControl,
			propertiesControl,
			interactionsControl,
			interactionWithAnyEmailControl,
			ignoreConfirmedControl
		);

		const addTemplateToTemplateSelectionList = (templateName: string) => {
			const isFirst = templateSelectionList.text.trim() === 'No email selected';
			if (isFirst) {
				templateSelectionList.clear();
			}
			const elements: Array<string | Elm> = [];
			const existingTemplatesPercentageSpans: Array<HSHElement> = templateSelectionList.queryAll(
				'.test-send-percentage'
			);
			const templateCount = existingTemplatesPercentageSpans.length + 1;
			const equalTestPercent = Math.round(1000 / (templateCount || 1)) / 10;
			if (!isFirst) {
				elements.push(', ');
			}
			elements.push(
				new Elm({
					type: 'span',
					class: 'selected-template-name',
					text: templateName,
				})
			);
			elements.push(' (');
			elements.push(
				new Elm({
					type: 'span',
					class: 'test-send-percentage',
					text: equalTestPercent.toString(),
				})
			);
			elements.push('%) ');
			elements.push(
				new Elm({
					type: 'button',
					class: 'button minor inline',
					text: 'Remove',
					events: {
						click: (event) => {
							const elm = new HSHElement(event.target);
							const wrapper = elm.parentUntil((p) =>
								p.classes.contains('selected-template-name-container')
							);
							wrapper.removeSelf();
							const firstTemplate = templateSelectionList.query(
								'.selected-template-name-container'
							);
							if (firstTemplate) {
								if (firstTemplate.text.startsWith(',')) {
									firstTemplate.removeChild(firstTemplate.childNodes[0]);
								}
							} else {
								templateSelectionList.append(
									new Elm('em', 'No email selected')
								);
							}
							const percentageSpans: Array<HSHElement> = templateSelectionList.queryAll(
								'.test-send-percentage'
							);
							const updatedTemplateCount = percentageSpans.length;
							const updatedPercent =
								Math.round(1000 / (updatedTemplateCount || 1)) / 10;
							for (let i = 0; i < percentageSpans.length; i++) {
								percentageSpans[i].text = updatedPercent.toString();
							}
							if (updatedTemplateCount < 2) {
								winningTypeControl.hide();
							}
						},
					},
				})
			);
			templateSelectionList.append(
				new Elm(
					{
						type: 'span',
						class: 'selected-template-name-container',
					},
					elements
				)
			);
			existingTemplatesPercentageSpans.forEach(
				(span) => (span.text = equalTestPercent.toString())
			);
			if (templateCount > 1) {
				winningTypeControl.show();
			}
		};

		useTemplateButton.on('click', () => {
			const emailName = templateIdElm.value.trim();
			if (!emailName) {
				return;
			}
			templateIdElm.value = '';
			addTemplateToTemplateSelectionList(emailName);
		});

		templateIdElm.on('focus', () => {
			if (templateListElm.isEmpty()) {
				if (isLoadingTemplates) {
					templateListElm.append(
						new Elm({
							type: 'div',
							class: 'status info m-t-1',
							text: 'Still loading templates. Try again shortly...',
						})
					);
				} else {
					templateListElm.append(
						createTemplateListElm(cachedTemplateList, (templateId) => {
							addTemplateToTemplateSelectionList(templateId);
						})
					);
				}
			} else if (
				templateListElm.text.indexOf('Still loading') >= 0 &&
				!isLoadingTemplates
			) {
				templateListElm.clear();
				templateListElm.append(
					createTemplateListElm(cachedTemplateList, (templateId) => {
						addTemplateToTemplateSelectionList(templateId);
					})
				);
			}
		});

		const hideInputControls = () => {
			broadcastAudience.hide();
			countControl.hide();
			broadcastEmailContainer.hide();
			broadcastTimeContainer.hide();
			broadcastTagsContainer.hide();
		};

		const showInputControls = () => {
			broadcastAudience.show();
			countControl.show();
			broadcastEmailContainer.show();
			broadcastTimeContainer.show();
			broadcastTagsContainer.show();
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
			updateUTCTime();
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
			const broadcastData: {
				templates?: Array<{
					name: string;
					testPercent: number;
				}>;
				templateId?: string;
				runAt?: number;
				list: string;
				tags: string[];
				excludeTags: string[];
				joinedAfter?: number;
				properties: { [key: string]: string };
				ignoreConfirmed: boolean;
				interactionWithAnyEmail?: {
					interactionType: string;
					interactionPeriodValue: number;
					interactionPeriodUnit: 'days';
				};
				interactions: {
					emailDate: string;
					templateId: string;
					click?: boolean;
					open?: boolean;
					received?: boolean;
				}[];
				tagOnClick?: string;
				winningType?: string;
			} = {
				templates: templateSelectionList
					.queryAll('.selected-template-name-container')
					.map((elm) => {
						return {
							name: elm.query('.selected-template-name')?.text,
							testPercent: parseFloat(elm.query('.test-send-percentage')?.text),
						};
					})
					.filter((template) => !!template.name),
				runAt: getSendTimeValue(),
				list: listsControl.getList(),
				tags: tagsControl.getTags(),
				excludeTags: excludeTagsControl.getTags(),
				joinedAfter: joinedAfterControl.getJoinedAfter(),
				properties: propertiesControl.getProperties(),
				interactions: interactionsControl.getInteractions(),
				interactionWithAnyEmail: interactionWithAnyEmailControl.getInteractionWithAnyEmailFilter(),
				ignoreConfirmed: ignoreConfirmedControl.getIgnoreConfirmed(),
				tagOnClick: byId('tag-on-click').value.trim(),
			};
			if (broadcastData.templates.length > 1) {
				broadcastData.winningType = winningTypeControl.getWinningType();
			}
			broadcastValidationMessage.clear();
			if (!broadcastData.templates.length) {
				broadcastValidationMessage.append(
					new Elm({
						type: 'p',
						class: 'status error',
						text: 'Please select an email to send.',
					})
				);
				return;
			}
			if (broadcastData.templates.length === 1) {
				broadcastData.templateId = broadcastData.templates[0].name;
				delete broadcastData.templates;
			}
			if (!broadcastData.list) {
				broadcastValidationMessage.append(
					new Elm({
						type: 'p',
						class: 'status error',
						text: 'Please select a list to send to.',
					})
				);
				return;
			}

			sendButton.hide();
			hideInputControls();

			const confirmationMessage: Elm[] = [
				new Elm(
					'span',
					`Send ${
						broadcastData.templateId
							? `email: ${broadcastData.templateId}`
							: `email variations: ${broadcastData.templates
									.map(
										(template) => `${template.name} (${template.testPercent}%)`
									)
									.join(', ')}`
					}`
				)
			];
			if (Array.isArray(broadcastData.templates) && broadcastData.templates.length > 1) {
				confirmationMessage.push(new Elm('br'))				
				confirmationMessage.push(new Elm('span', `\tWinning email variation selection method: ${broadcastData.winningType}`))
			}
			confirmationMessage.push(new Elm('br'))
			confirmationMessage.push(new Elm('span', `At time: ${getSendTimeString(broadcastData.runAt)}`))
			confirmationMessage.push(new Elm('br'))
			const hasFilterData =
				broadcastData.tags.length ||
				broadcastData.excludeTags.length ||
				Object.keys(broadcastData.properties).length ||
				broadcastData.interactions.length ||
				broadcastData.interactionWithAnyEmail ||
				broadcastData.joinedAfter ||
				broadcastData.ignoreConfirmed;
			if (hasFilterData) {
				confirmationMessage.push(
					new Elm('span', `To list: ${listsControl.getList()}`)
				);
				confirmationMessage.push(new Elm('br'));
				confirmationMessage.push(new Elm('span', 'Filter by subscribers:'));
				confirmationMessage.push(new Elm('br'));
				let isFirstFilter = true;
				if (broadcastData.interactionWithAnyEmail) {
					confirmationMessage.push(new Elm(
						'span',
						`  who have ${broadcastData.interactionWithAnyEmail.interactionType} any email in the last ${broadcastData.interactionWithAnyEmail.interactionPeriodValue} ${broadcastData.interactionWithAnyEmail.interactionPeriodUnit}`
					))
					confirmationMessage.push(new Elm('br'))
					isFirstFilter = false;
				}
				if (broadcastData.tags.length) {
					confirmationMessage.push(
						new Elm(
							'span',
							`  ${isFirstFilter ? '' : 'and '}who have the tags: ${broadcastData.tags.join(' and ')}`
						)
					);
					confirmationMessage.push(new Elm('br'));
					isFirstFilter = false;
				}
				if (broadcastData.excludeTags.length) {
					confirmationMessage.push(
						new Elm(
							'span',
							`  ${isFirstFilter ? '' : 'and '}who do not have the tags: ${broadcastData.excludeTags.join(' or ')}`
						)
					);
					confirmationMessage.push(new Elm('br'));
					isFirstFilter = false;
				}
				if (broadcastData.joinedAfter) {
					confirmationMessage.push(
						new Elm(
							'span',
							`  ${isFirstFilter ? '' : 'and '}who joined after: ${
								new Date(broadcastData.joinedAfter).toUTCString()
							} (UTC) / ${
								new Date(broadcastData.joinedAfter).toLocaleString()
							} (local time)`
						)
					)
				}
				if (Object.keys(broadcastData.properties).length) {
					confirmationMessage.push(
						new Elm(
							'span',
							`  ${isFirstFilter ? '' : 'and '}who have the properties:`
						)
					);
					confirmationMessage.push(new Elm('br'));
					for (const prop in broadcastData.properties) {
						confirmationMessage.push(
							new Elm('span', `    ${prop}: ${broadcastData.properties[prop]}`)
						);
						confirmationMessage.push(new Elm('br'));
					}
					isFirstFilter = false;
				}
				if (broadcastData.interactions.length) {
					confirmationMessage.push(
						new Elm(
							'span',
							`  ${isFirstFilter ? '' : 'and '}who had the following interactions with previous emails:`
						)
					);
					confirmationMessage.push(new Elm('br'));
					broadcastData.interactions.forEach((interaction) => {
						confirmationMessage.push(
							new Elm('span', `    ${getInteractionString(interaction)}`)
						);
						confirmationMessage.push(new Elm('br'));
					});
					isFirstFilter = false;
				}
				if (broadcastData.ignoreConfirmed) {
					confirmationMessage.push(
						new Elm({
							type: 'span',
							attrs: {
								style: 'color:#c6520d;font-weight:bold',
							},
							text: `  ⚠ ${
								isFirstFilter ? '' : 'and '
							}ignore whether or not subscribers have been confirmed`,
						})
					);
					confirmationMessage.push(new Elm('br'));
					isFirstFilter = false;
				}
			} else {
				confirmationMessage.push(
					new Elm(
						'span',
						`To all subscribers on the list: ${listsControl.getList()}`
					)
				);
				confirmationMessage.push(new Elm('br'))
			}
			if (broadcastData.tagOnClick) {
				confirmationMessage.push(new Elm({
					type: 'span',
					text: `Tag to assign to subscriber when email is clicked: ${broadcastData.tagOnClick}`
				}))
				confirmationMessage.push(new Elm('br'))
			}
			confirmationMessage.push(new Elm('span'));
			confirmationDetailsBox.append([
				new Elm(
					'p',
					'You are about the send a broadcast using the following settings:'
				),
				new Elm(
					'div',
					new Elm(
						{
							type: 'pre',
							attrs: {
								style: 'white-space: pre-wrap',
							},
						},
						confirmationMessage
					)
				),
			]);

			const confirmAndSend = async () => {
				try {
					confirmAndSendButton.disable();
					cancelSendButton.disable();
					await apiRequest('/admin/broadcast', {
						method: 'POST',
						body: JSON.stringify(broadcastData),
					});
					confirmAndSendButton.removeEventListener('click', confirmAndSend);
					confirmAndSendButton.hide();
					cancelSendButton.hide();
					sendStatusMessage.clear();
					sendStatusMessage.show();
					sendStatusMessage.append(
						new Elm({
							type: 'p',
							attrs: { class: 'status success' },
							text: 'Broadcast triggered',
						})
					);
				} catch (err) {
					console.error(err);
					sendStatusMessage.clear();
					sendStatusMessage.show();
					sendStatusMessage.append(
						new Elm({
							type: 'p',
							attrs: { class: 'status error' },
							text: `Error sending broadcast: ${err.message}`,
						})
					);
				} finally {
					confirmAndSendButton.enable();
					cancelSendButton.enable();
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
