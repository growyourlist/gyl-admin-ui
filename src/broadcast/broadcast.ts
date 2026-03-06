import { ListsControl } from './listsControl';
import { TagsControl } from './tagsControl';
import { PropertiesControl } from './propertiesControl';
import { InteractionsControl } from './interactionsControl';
import { onDOMReady, byId, Elm, HSHElement } from '../common/hsh/hsh';
import { SubscriberCountControl } from './subscriberCountControl';
import { apiRequestOrThrow } from '../common/apiRequest';
import { loadTemplates } from '../common/loadTemplates';
import { createTemplateListElm } from '../common/createTemplateListElm';
import { InteractionWithAnyEmailControl } from './InteractionWithAnyEmailControl';
import { IgnoreConfirmedControl } from './IgnoreConfirmedControl';
import { WinningTypeControl } from './WinningTypeControl';
import { JoinedAfterControl } from './joinedAfterControl';
import { BroadcastTimeControl } from './broadcastTimeControl';
import { SourceEmailControl } from './sourceEmailControl';

const getInteractionString: (interaction: {
	emailDate: string;
	templateId: string;
	click?: boolean;
	open?: boolean;
	received?: boolean;
}) => string = (interaction) => {
	if (typeof interaction.received !== 'undefined') {
		return `${interaction.received ? 'received' : 'did not receive'} ${interaction.templateId
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
		const templateSelectionListPlaceholder = byId('template-selection-list-placeholder')
		const listsControl = new ListsControl('#lists-container');
		listsControl.loadLists();
		const tagsControl = new TagsControl('#tags-container');
		const excludeTagsControl = new TagsControl('#exclude-tags-container');
		const joinedAfterControl = new JoinedAfterControl('#joined-after-container');
		const broadcastTimeControl = new BroadcastTimeControl('#broadcast-time-container');
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

		/** keeps test %’s correct + shows/hides winner UI */
		const updatePercentages = () => {
			const spans = templateSelectionList.queryAll('.test-send-percentage');
			const count = spans.length;
			if (!count) {
				templateSelectionList.clear();
				templateSelectionList.append(new Elm('em', 'No email selected'));
				winningTypeControl.hide();
				return;
			}
			const percent = Math.round(1000 / count) / 10;
			spans.forEach((s) => (s.text = percent.toString()));
			count > 1 ? winningTypeControl.show() : winningTypeControl.hide();
		};

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

		const addTemplateToTemplateSelectionList = async (templateName: string) => {
			const isFirstTemplate = !templateSelectionList.query('.selected-template-name-container');
			if (isFirstTemplate) {
				templateSelectionListPlaceholder.hide()
				templateSelectionList.show()
			}

			// Create the row to display the selected template email
			const row = new Elm({
				type: 'tr',
				class: 'template-selection-row selected-template-name-container',
			}).toHTMLElement();

			// 1) Email template name cell
			row.appendChild(new Elm({
				type: 'td',
				class: 'template-selection-cell template-name-cell selected-template-name',
				text: templateName,
			}).toHTMLElement());

			// 2) Send percentage cell
			const percentageCell = new Elm({
				type: 'td',
				class: 'template-selection-cell percentage-cell',
			}).toHTMLElement();
			percentageCell.appendChild(new Elm({
				type: 'span',
				class: 'test-send-percentage test-send-percentage',
				text: '0',
			}).toHTMLElement());
			row.appendChild(percentageCell);

			// 3) Sender placeholder cell
			const senderCell = new Elm({
				type: 'td',
				class: 'template-selection-cell sender-cell',
				text: 'Loading...'
			}).toHTMLElement();
			row.appendChild(senderCell);

			// 4) Actions cell (remove button)
			const actionCell = new Elm({
				type: 'td',
				class: 'template-selection-cell actions-cell',
			}).toHTMLElement();
			actionCell.appendChild(
				new Elm({
					type: 'button',
					class: 'button minor inline',
					text: 'Remove',
					events: {
						click: () => {
							row.remove();
							updatePercentages();
							const isSelectionEmpty = !templateSelectionList.query('.selected-template-name-container');
							if (isSelectionEmpty) {
								templateSelectionList.hide()
								templateSelectionListPlaceholder.show()
							}
						},
					},
				}).toHTMLElement()
			);
			row.appendChild(actionCell);

			// append to table and recalc percentages
			templateSelectionList.query('.template-selection-body')?.append(row);
			updatePercentages();

			// fetch sender name and fill into sender-cell
			try {
				const res = await apiRequestOrThrow(
					`/admin/template/?templateName=${encodeURIComponent(templateName)}`
				);
				if (!res.ok) {
					throw new Error(`Invalid response getting template details: ${res.status}`)
				}
				const template = await res.json();
				const senderCtrl = new SourceEmailControl({
					templateName,
					sourceEmail: template.sourceEmail || '',
				});
				new HSHElement(senderCell).clear()
				senderCell.appendChild(senderCtrl.getElement());
			} catch (error) {
				console.error(error)
				senderCell.appendChild(
					new Elm({
						type: 'span',
						class: 'status error',
						text: `Error fetching sender: ${error?.message}`,
					}).toHTMLElement()
				);
			}
		}

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
				subscriberRunAt?: string;
				datetimeContext: 'utc' | 'subscriber';
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
					.map((elm) => ({
						name: elm.query('.selected-template-name')?.text,
						testPercent: parseFloat(elm.query('.test-send-percentage')?.text)
					}))
					.filter((template) => !!template.name),
				datetimeContext: broadcastTimeControl.getBroadcastTimeContext(),
				runAt: broadcastTimeControl.getBroadcastTime(),
				subscriberRunAt: broadcastTimeControl.getSubscriberBroadcastTime(),
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
					`Send ${broadcastData.templateId
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
			if (broadcastData.datetimeContext === 'subscriber') {
				confirmationMessage.push(new Elm('span', `At date/time in the subscriber's time zone (approximate): ${broadcastData.subscriberRunAt.split('T').join(' at ')}`));
			} else {
				confirmationMessage.push(new Elm('span', `At time (approximate): ${getSendTimeString(broadcastData.runAt)}`))
			}
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
							`  ${isFirstFilter ? '' : 'and '}who joined after: ${new Date(broadcastData.joinedAfter).toUTCString()
							} (UTC) / ${new Date(broadcastData.joinedAfter).toLocaleString()
							} (local time)`
						)
					)
					confirmationMessage.push(new Elm('br'));
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
							text: `  ⚠ ${isFirstFilter ? '' : 'and '
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
					await apiRequestOrThrow('/admin/broadcast', {
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
