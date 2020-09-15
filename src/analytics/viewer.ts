import { scaleOrdinal, schemeDark2, scaleTime, extent, scaleLinear, max, select as d3select, axisLeft, axisBottom, line } from 'd3'

import { apiRequest } from '../common/apiRequest'
import { onDOMReady, byId, Elm } from '../common/hsh/hsh'

const updateSendDates = (templateHistory: any[]): void => {
	const sentOnDate = byId('sent-on-date')
	sentOnDate.clear()
	const sendDates: any[] = [];
	templateHistory.forEach((dateRange: any) => {
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
		const attrs: any = {
			value: sendDate
		};
		if (i === 0) {
			attrs.selected = '';
		}
		sentOnDate.append(new Elm(
			{
				type: 'option',
				attrs,
			},
			sendDate
		))
	});
};

/** When the dom is ready... */
onDOMReady(async () => {
	let graphData: any = null
	let graphGroups: any[] = []
	let graphInfo: any = {}
	const loadingMessage = byId('analytics-loading-message')
	loadingMessage.text = 'Loading...'
	const emailHistoryResponse = await apiRequest('/admin/email-history')
	const emailHistory = await emailHistoryResponse.json()
	const emailHistoryElm = byId('email-select')
	const templateIds = Object.keys(emailHistory)
	templateIds.sort((a: any, b: any) => a.localeCompare(b, undefined, {
		sensitivity: 'base'
	}));
	let templateHistory = null
	templateIds.forEach((templateId, i) => {
		const attrs: any = {
			value: templateId,
			'data-history': JSON.stringify(emailHistory[templateId])
		}
		if (i === 0) {
			attrs.selected = ''
			templateHistory = emailHistory[templateId]
		}
		const option = new Elm(
			{
				type: 'option',
				attrs,
			},
			templateId
		)
		emailHistoryElm.append(option)
	})
	if (templateHistory) {
		updateSendDates(templateHistory)
	}
	loadingMessage.hide()
	const analyticsContent = byId('analytics-content')
	analyticsContent.show()

	emailHistoryElm.on('change', function () {
		const select: any = this;
		const option = select.options[select.selectedIndex];
		const history = JSON.parse(option.dataset.history);
		updateSendDates(history);
	})

	const drawChart = () => {
		const analyticsData = graphData;
		const svgWidth = 960;
		const svgHeight = 500;
		const margin = {
			top: 20,
			right: 20,
			bottom: 40,
			left: 40
		};
		const chartWidth = svgWidth - margin.left - margin.right;
		const chartHeight = svgHeight - margin.top - margin.bottom;
		const groups = graphGroups;
		const data: any[] = [];
		const quarterHourBlocks: any = {};
		const totals: any = {};
		groups.forEach(name => {
			totals[name] = 0
			Object.keys(analyticsData[name]).forEach(blockstamp => {
				if (quarterHourBlocks[blockstamp]) {
					quarterHourBlocks[blockstamp][name] = analyticsData[name][blockstamp]
				}
				else {
					quarterHourBlocks[blockstamp] = {
						time: new Date(parseInt(blockstamp))
					}
					groups.forEach(gname => {
						quarterHourBlocks[blockstamp][gname] = gname === name ?
						analyticsData[name][blockstamp] : 0
					})
				}
				totals[name] += analyticsData[name][blockstamp]
			})
		})

		// Object.keys(hourBlocks).forEach(utcHourStr => {
		// 	data.push(hourBlocks[utcHourStr]);
		// });
		Object.keys(quarterHourBlocks).forEach(blockstamp => {
			data.push(quarterHourBlocks[blockstamp])
		})
		data.sort((a, b) => a.time - b.time);
		if (!data.length) {
			byId('graph').append(new Elm('p', 'No data'));
			return;
		}
		const hourBeforeFirst = new Date(data[0].time.valueOf());
		hourBeforeFirst.setUTCHours(hourBeforeFirst.getUTCHours() - 1);
		const hourAfterLast = new Date(data[data.length - 1].time.valueOf());
		hourAfterLast.setUTCHours(hourAfterLast.getUTCHours() + 1);
		const prepender: any = {
			time: hourBeforeFirst
		};
		const appender: any = {
			time: hourAfterLast
		};
		groups.forEach(name => {
			prepender[name] = 0;
			appender[name] = 0;
		});
		data.splice(0, 0, prepender);
		data.push(appender);
		const color = scaleOrdinal().domain(groups).range(schemeDark2);
		const colors = groups.map((n, i) => color(i.toString()));
		const labels = (new Elm('p')).toHTMLElement();
		groups.forEach((name, i) => {
			labels.append((new Elm({
				type: 'b',
				text: name,
				attrs: {
					style: `color:${colors[i]}`
				},
			})).toHTMLElement())
		});

		const summaryElm = new Elm('p', `${graphInfo.templateId} ${graphInfo.date
		} summary: ${totals['sends']} sends, ${totals['opens']} opens (${
			Math.round(100 * totals['opens'] / totals['sends'])}%), ${
				totals['clicks']} clicks (${Math.round(
					100 * totals['clicks'] / totals['sends'])}%)`);
		byId('graph').append(summaryElm);
		byId('graph').element.appendChild(labels);
		const x = scaleTime().domain(extent(data, d => d.time)).range([0,
			chartWidth]);
		const y = scaleLinear().domain([0,
			max(data, d => max(groups.map(name => d[name])))]).range([chartHeight,
				0]);
		const svg = d3select('#graph').append('svg').attr('width', svgWidth).attr('height', svgHeight).append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
		svg.append('g').attr('transform', `translate(0,${chartHeight
			}
		)`).call(axisBottom(x));
		svg.append('g').call(axisLeft(y));
		groups.forEach((name, i) => {
			svg.append('path').datum(data).attr('fill', 'none').attr('stroke', colors[i].toString()).attr('stroke-width', 1.5).attr('d', line().x((d: any) => x(d.time)).y(d => y(d[name])));
		});
	}

	const getAnalyticsButton = byId('get-analytics-button')
	getAnalyticsButton.on('click', async function () {
		try {
			getAnalyticsButton.disable()
			const graph = byId('graph')
			graph.append(new Elm('p', 'Loading...'))
			const sentOnDate = byId('sent-on-date')
			graphInfo.templateId = emailHistoryElm.value
			graphInfo.date = sentOnDate.value
			const params = `templateId=${encodeURIComponent(graphInfo.templateId)}&date=${encodeURIComponent(graphInfo.date)}`
			const analyticsResponse = await apiRequest(`/admin/analytics?${params}`)
			if (!analyticsResponse.ok) {
				throw new Error(`Failed to retrieve data. Response: ${analyticsResponse.status} ${analyticsResponse.statusText}`)
			}
			graphData = await analyticsResponse.json()
			graph.clear()
			getAnalyticsButton.enable()
			graphGroups = []
			if (byId('show-sends-checkbox').checked) {
				graphGroups.push('sends')
			}
			if (byId('show-opens-checkbox').checked) {
				graphGroups.push('opens')
			}
			if (byId('show-clicks-checkbox').checked) {
				graphGroups.push('clicks')
			}
			drawChart()
		}
		catch (err) {
			console.error(err)
		}
		finally {
			getAnalyticsButton.enable()
		}
	})
})
