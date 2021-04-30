import { validateElement } from '../common/validateElement';
import { parse } from 'papaparse';
import {
	onDOMReady,
	firstBySelector,
	Elm,
	HSHElement,
	bySelector,
	byId,
} from '../common/hsh/hsh';
import { apiRequest } from '../common/apiRequest';

const validateSubscriberEmail = (inputElm: HTMLInputElement): void => {
	validateElement(inputElm, {
		email: {
			message: 'Subscriber Email must be a valid email address.',
		},
	});
};

const getQueueItemTypeIcon = (itemType: string): string => {
	switch (itemType) {
		case 'make choice based on tag':
			return '❓';
		case 'send email':
			return '📧';
		case 'unsubscribe':
			return '🔚';
		case 'wait':
			return '⏱';
		default:
			return '⬛';
	}
};

const getQueueItemElm = (queueItem: any): Elm => {
	let output = getQueueItemTypeIcon(queueItem.type) + ' ';
	if (typeof queueItem.templateId === 'string') {
		output += `Send email: ${queueItem.templateId} `;
	}
	if (typeof queueItem.autoresponderId === 'string') {
		output += `Autoresponder step: ${queueItem.autoresponderId} ➡ ${
			queueItem.autoresponderStep || '<no step defined>'
		}`;
	}
	return new Elm('strong', output);
};

const addToggleCollapseListeners = () => {
	const buttons = bySelector('.toggle-collapse');
	buttons.forEach((button) => {
		button.on('click', () => {
			const container = button.parentUntil((elm) =>
				elm.classes.contains('tool-container')
			);
			if (!container) {
				return;
			}
			const tool = container.query('.tool');
			if (!tool) {
				return;
			}
			if (tool.classes.contains('collapsed')) {
				tool.classes.remove('collapsed');
				button.text = '➖ Collapse';
			} else {
				tool.classes.add('collapsed');
				button.text = '➕ Expand';
			}
		});
	});
};

onDOMReady(() => {
	const subscriberEmailInput = firstBySelector('.subscriber-email');
	subscriberEmailInput.on('change', function () {
		validateSubscriberEmail(<HTMLInputElement>subscriberEmailInput.element);
	});
	subscriberEmailInput.on('keyup', function () {
		validateSubscriberEmail(<HTMLInputElement>subscriberEmailInput.element);
	});
	const subscriberInfoEmailInput = firstBySelector('.subscriber-info-email');
	subscriberInfoEmailInput.on('change', function () {
		validateSubscriberEmail(<HTMLInputElement>subscriberInfoEmailInput.element);
	});
	subscriberInfoEmailInput.on('keyup', function () {
		validateSubscriberEmail(<HTMLInputElement>subscriberInfoEmailInput.element);
	});
	addToggleCollapseListeners();

	const newSubscriberEmailInput = firstBySelector('.new-subscriber-email');
	const newSubscriberTagsInput = firstBySelector('.new-subscriber-tags');
	const newSubscriberPropertiesInput = firstBySelector(
		'.new-subscriber-properties'
	);
	const newSubscriberButton = firstBySelector('.new-subscriber-button');
	const newSubscriberStatusContainer = byId('new-subscriber-status-container');
	newSubscriberButton.on('click', async () => {
		try {
			newSubscriberStatusContainer.clear();
			newSubscriberButton.disable();
			const email = newSubscriberEmailInput.value;
			const tags = newSubscriberTagsInput.value.trim()
				? newSubscriberTagsInput.value.split(',').map((t) => t.trim())
				: [];
			const properties = {};
			if (newSubscriberPropertiesInput.value.trim()) {
				const lines = newSubscriberPropertiesInput.value.split('\n');
				lines.forEach((line) => {
					if (line.trim()) {
						const lineParts = line.split(/: ?/);
						if (lineParts.length !== 2) {
							throw new Error(
								'Subscriber properties must be in the format "property: value", using only one property and value pair per line.'
							);
						}
						properties[lineParts[0]] = lineParts[1];
					}
				});
			}
			const subscriber = Object.assign({}, properties, {
				email,
				tags,
			});
			await apiRequest('/admin/subscriber', {
				method: 'POST',
				body: JSON.stringify(subscriber),
			});
			newSubscriberStatusContainer.append(
				new Elm({
					type: 'div',
					class: 'status success m-t-0p5',
					text: 'Subscriber created',
				})
			);
		} catch (err) {
			newSubscriberStatusContainer.append(
				new Elm({
					type: 'div',
					class: 'status error m-t-0p5',
					text: err.message,
				})
			);
		} finally {
			newSubscriberButton.enable();
		}
	});

	const getSubscriberButton = firstBySelector('.get-subscriber-info-button');
	const handleGetSubscriberInfoButtonClick = async () => {
		const errorContainer = byId('subscriber-error-container');
		try {
			errorContainer.classes.remove('m-t-1');
			errorContainer.clear();
			const email = subscriberInfoEmailInput.value;
			getSubscriberButton.disable();
			const subscriberResponse = await apiRequest(
				`/admin/subscriber?email=${encodeURIComponent(email)}`
			);
			const subscriber = await subscriberResponse.json();
			const subscriberInfoContainer = firstBySelector(
				'.subscriber-info-container'
			);
			subscriberInfoContainer.clear();
			subscriberInfoContainer.append([
				new Elm({ type: 'div', attrs: { class: 'subscriber-info' } }, [
					new Elm('p', `Email: ${subscriber.email}`),
					new Elm(
						'p',
						`Joined: ${
							subscriber.joined && new Date(subscriber.joined).toISOString()
						}`
					),
					new Elm(
						'p',
						`Last Open/Click: ${
							subscriber.lastOpenOrClick &&
							new Date(subscriber.lastOpenOrClick).toISOString()
						}`
					),
					new Elm(
						'p',
						`Tags: ${subscriber.tags && subscriber.tags.join(', ')}`
					),
					new Elm('p', [
						new Elm({
							type: 'button',
							class: 'button minor',
							text: '❌ Delete Subscriber',
							events: {
								'click': async (event) => {
									const button = new HSHElement(event.target);
									const infoContainer = button.parentUntil(
										elm => elm.classes.contains('subscriber-info-container')
									)
									if (!infoContainer) {
										console.error(`No subscriber-info-container found`);
										return;
									}
									try {
										if (confirm(`Are you sure you want to delete ${subscriber.email}?`)) {
											infoContainer.style.setProperty('position', 'relative');
											infoContainer.prepend(new Elm(
												{
													type: 'div',
													class: 'overlay',
													attrs: {
														style: 'position: absolute;top: 0;left: 0; '
															+ 'bottom: 0; width: 100%; display: flex; '
															+ 'justify-content: center; align-items: center; '
															+ 'background-color: rgba(0, 0, 0, .80)',
													},
												},
												new Elm(
													{
														type: 'div',
														attrs: {
															style: 'text-align: center',
														},
														class: 'overlay-content',
													},
													new Elm(
														{
															type: 'div',
															attrs: {
																style: 'font-size: 2em; font-weight: bold; '
																	+ 'color: #fff; text-shadow: 2px 2px 3px black;'
															},
															text: 'Deleting...',
														}
													)
												)
											))
											const deleteRes = await apiRequest(
												`/admin/subscriber?subscriberId=${subscriber.subscriberId}`,
												{
													method: 'DELETE'
												}
											)
											if (!deleteRes.ok) {
												const resText = await deleteRes.text()
												throw new Error(resText || `${deleteRes.status} ${deleteRes.statusText}`)
											}
											const overlayContent = infoContainer.query('.overlay-content')
											overlayContent.clear();
											overlayContent.append([
												new Elm({
													type: 'div',
													attrs: {
														style: 'font-size: 2em; font-weight: bold; '
															+ 'color: #fff; text-shadow: 2px 2px 3px black;'
													},
													text: 'Deleted ✔',
												}),
												new Elm(
													{ type: 'div' },
													new Elm({
														type: 'button',
														class: 'button main',
														text: 'OK',
														events: {
															'click': () => {
																const overlay = infoContainer.query('.overlay');
																if (overlay) {
																	overlay.removeSelf()
																	subscriberInfoContainer.clear()
																}
															}
														}
													})
												)
											])
										}
									} catch (err) {
										console.log(err)
										const overlayContent = infoContainer.query('.overlay-content')
										overlayContent.clear();
										overlayContent.append([
											new Elm({
												type: 'div',
												attrs: {
													style: 'font-size: 2em; font-weight: bold; '
														+ 'color: #d29a9a; text-shadow: 2px 2px 3px black;'
												},
												text: `Error deleting subscriber: ${err.message}`,
											}),
											new Elm(
												{ type: 'div' },
												new Elm({
													type: 'button',
													class: 'button main',
													text: 'OK',
													events: {
														'click': () => {
															const overlay = infoContainer.query('.overlay');
															if (overlay) {
																overlay.removeSelf()
															}
														}
													}
												})
											)
										])
										// TODO show error to user
									}
								}
							},
						})
					])
				]),
				new Elm(
					{
						type: 'pre',
					},
					JSON.stringify(subscriber, null, 2)
				),
			]);
			getSubscriberButton.enable();
		} catch (err) {
			if (/\b404\b/.test(err.message)) {
				errorContainer.classes.add('m-t-1');
				errorContainer.append(
					new Elm({
						type: 'div',
						class: 'status error',
						text: 'Subscriber not found',
					})
				);
			} else {
				console.error(err);
				errorContainer.classes.add('m-t-1');
				errorContainer.append(
					new Elm({
						type: 'div',
						class: 'status error',
						text: `Error getting subscriber: ${err.message}`,
					})
				);
			}
		}
	};
	getSubscriberButton.on('click', handleGetSubscriberInfoButtonClick);

	const getItemsButton = firstBySelector('.get-subscriber-queue-items-button');
	const handleGetItemsButtonClick = async () => {
		getItemsButton.disable();
		try {
			const email = subscriberEmailInput.value;
			const itemsResponse = await apiRequest(
				`/admin/subscriber/queue?email=${email}`
			);
			const items = await itemsResponse.json();
			const container = firstBySelector('.subscriber-queue-items-container');
			items.sort((a: any, b: any) => b.runAt - a.runAt);
			container.prepend([
				new Elm('h3', `Queue items for ${email}`),
				!items.length
					? new Elm('p', 'No queue items found')
					: new Elm(
							{
								type: 'ol',
								attrs: {
									class: 'queue-items list bordered vertical no-style',
								},
							},
							items.map((item: any) => {
								const timestamp = new Date(item.runAt);
								return new Elm('li', [
									new Elm(
										{
											type: 'div',
											attrs: {
												class: 'queue-item',
											},
										},
										[
											new Elm(
												'div',
												`${timestamp
													.toISOString()
													.replace(/T/, ' ')
													.replace(/\.\d+Z$/, ' UTC')}`
											),
											new Elm(
												{
													type: 'div',
													attrs: {
														class: `ta-right ${
															item.completed ? 'completed' : 'queued'
														}`,
													},
												},
												[
													`${item.completed ? 'Completed' : 'Queued'} `,
													new Elm('span', '●'),
												]
											),
											getQueueItemElm(item),
											new Elm(
												{
													type: 'button',
													attrs: {
														class: 'button plain',
													},
													events: {
														click: function () {
															const button = new HSHElement(this);
															const state = button.element.getAttribute(
																'data-state'
															);
															const details = button.parent.query(
																'.queue-item-details'
															);
															if (state === null) {
																details.append(
																	new Elm(
																		{
																			type: 'pre',
																		},
																		JSON.stringify(item, null, 2)
																	)
																);
																details.show();
																button.text = '❌ Close Details';
																button.element.setAttribute(
																	'data-state',
																	'expanded'
																);
															} else if (state === 'expanded') {
																details.hide();
																button.text = '🔍 Show Details';
																button.element.setAttribute(
																	'data-state',
																	'collapsed'
																);
															} else if (state === 'collapsed') {
																details.show();
																button.text = '❌ Close Details';
																button.element.setAttribute(
																	'data-state',
																	'expanded'
																);
															}
														},
													},
												},
												'🔍 Show Details'
											),
											new Elm({
												type: 'div',
												attrs: {
													class: 'queue-item-details grid-item-all-columns',
													style: 'display:none',
												},
											}),
										]
									),
								]);
							})
						),
			]);
		} catch (err) {
			console.error(err);
		} finally {
			getItemsButton.enable();
		}
	};
	getItemsButton.on('click', handleGetItemsButtonClick);

	const pingButton = firstBySelector('.ping-button');
	const handlePingButtonClick = async () => {
		const resultContainer = firstBySelector('.ping-result-container');
		try {
			const pingResponse = await fetch(
				`${localStorage.getItem('gyl-api-url')}/ping`,
				{ mode: 'cors' }
			);
			const data = await pingResponse.json();

			resultContainer.prepend(
				new Elm({ type: 'pre' }, [
					new Date().toISOString(),
					' ',
					JSON.stringify(data),
				])
			);
		} catch (err) {
			console.error(err);
			resultContainer.prepend(
				new Elm({ type: 'pre' }, `${new Date().toISOString()} ${err.message}`)
			);
		}
	};
	pingButton.on('click', handlePingButtonClick);

	const authPingButton = firstBySelector('.auth-ping-button');
	const handleAuthPingButtonClick = async () => {
		const resultContainer = firstBySelector('.auth-ping-result-container');
		try {
			const pingResponse = await apiRequest('/auth-ping');
			const data = await pingResponse.json();
			resultContainer.prepend(
				new Elm({ type: 'pre' }, [
					new Date().toISOString(),
					' ',
					JSON.stringify(data),
				])
			);
		} catch (err) {
			console.error(err);
			resultContainer.prepend(
				new Elm({ type: 'pre' }, `${new Date().toISOString()} ${err.message}`)
			);
		}
	};
	authPingButton.on('click', handleAuthPingButtonClick);

	const importButton = byId('import-button');
	const handleImportButtonClick = async () => {
		const statusContainerElm = byId('import-status-container');
		try {
			importButton.disable();
			statusContainerElm.clear();
			statusContainerElm.append(
				new Elm(
					{
						type: 'div',
						class: 'status info',
					},
					'Importing list...'
				)
			);
			const statusElm = statusContainerElm.query('.status.info');
			const importDataElm = byId('import-data');
			const importData = parse(importDataElm.value, {
				header: true,
				dynamicTyping: true,
			});

			if (importData.meta.fields.indexOf('email') < 0) {
				throw new Error('Header row must contain "email" field name');
			}
			if (!importData.data.length) {
				throw new Error('No data to import');
			}
			if ((importData.data[0] as any)['__parsed_extra']) {
				throw new Error(
					'Number of headers must match number of fields in rows'
				);
			}

			importData.data = importData.data.filter((item: any) => !!item.email);

			const totalRows = importData.data.length;
			const batchSize = 25;
			let count = 0;
			let batch = importData.data.splice(0, batchSize);
			do {
				await apiRequest('/admin/subscribers', {
					method: 'POST',
					body: JSON.stringify({
						opts: {
							skipDuplicateCheck: !!byId('import-skip-duplicate-check').checked,
							defaultConfirmedValue: true,
							defaultUnsubscribedValue: false,
						},
						subscribers: batch.map((subscriber: any) => {
							if (!subscriber.tags) {
								return subscriber;
							}
							subscriber.tags = subscriber.tags.split(',');
							return subscriber;
						}),
					}),
				});
				count += batch.length;
				statusElm.text = `Imported ${count} of ${totalRows} subscriber records.`;
				batch = importData.data.splice(0, batchSize);
			} while (batch.length);

			// if (!headerRow.indexOf('email')) {
			//   throw new Error('Import data must start with a header row and it ' +
			//     'must contain email as one of the columns.')
			// }

			await new Promise((r) => setTimeout(r, 1500));

			statusContainerElm.clear();
			statusContainerElm.append(
				new Elm(
					{
						type: 'div',
						class: 'status success',
					},
					'List imported'
				)
			);
		} catch (err) {
			statusContainerElm.clear();
			statusContainerElm.append(
				new Elm(
					{
						type: 'div',
						class: 'status error',
					},
					`Error: ${err.message}`
				)
			);
		} finally {
			importButton.enable();
		}
	};
	importButton.on('click', handleImportButtonClick);
});
