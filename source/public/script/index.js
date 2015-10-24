/**
 * Document Ready
 */
$(document).ready(function() {
	getEventStats();
	$('.btn.chart').on('click', onChartButton);
});


/**
 * Event handler for the buttons to draw the charts
 * @param {Event} JQuery event 
 */
function onChartButton(event) {
	var action = $(event.target).attr('data-action');
	switch (action) {
		case 'schools':
			$('.school-chart').empty();
			$.get('/data/users/schools')
				.done(function(res) {
					var filtered = filter(res, function(d) { return d.count > 2; });
					plotBarChart(d3.select('.school-chart'), filtered);
				});
			break;
		case 'genders':
			$('.gender-chart').empty();
			$.get('/data/anonData/genders')
				.done(function(res) {
					var filtered = filter(res, function(d) { return d._id !== null; });
					plotPieChart(d3.select('.gender-chart'), filtered);
				});
			break;
		default: break;
	}
}


/** 
 * Plots a pie chart from the given data
 * @param {d3.selection} $chart - d3 handle to the location of where to 
 * 	draw the chart
 * @param {array} data - array of objects from which to create the chart
 * @returns {void}
 */
function plotPieChart($chart, data) {
	var margin = { top: 20, right: 10, bottom: 10, left: 10 },
		width = 960 - margin.right - margin.left,
		height = 500 - margin.top - margin.bottom,
		radius = Math.min(width, height) / 2,
		total = d3.sum(data, function(d) { return d.count; });
	var color = d3.scale.category10()
	var arc = d3.svg.arc()
			.outerRadius(radius - 10)
			.innerRadius(0),
		outerArc = d3.svg.arc()
			.outerRadius(radius)
			.innerRadius(radius);
	var pie = d3.layout.pie()
		.value(function(d) { return d.count; });
	var svg = $chart.append('svg')
		.attr('class', 'pie')
		.attr('width', width + margin.left + margin.right)
		.attr('height', height + margin.top + margin.bottom)
		.append('g')
			.attr('transform', 'translate(' + (width/2 + margin.left) + 
				',' + (height/2 + margin.top) + ')');
	var g = svg.selectAll('.arc')
		.data(pie(data))
		.enter().append('g')
			.attr('class', 'arc');
	g.append('path')
		.attr('d', arc)
		.style('fill', function(d, i) { return color(i); });
		
	function midAngle(d) {
		return d.startAngle + (d.endAngle + d.startAngle)  / 2;
	}
	
	svg.append('g')
		.attr('class', 'labels');
	svg.select('.labels').selectAll('text')
			.data(pie(data))
		.enter().append('text')
			.attr('dy', '.35em')
			.text(function(d) {
				var percent = Math.round(d.data.count / total * 100);
				percent = percent || '< 1';
				return d.data._id + ' (' + percent + '%)';
			})
			.attr('transform', function(d) {
				var pos = outerArc.centroid(d);
				pos[0] = radius * (midAngle(d) < Math.PI ? 1 : -1);
				return 'translate(' + pos + ')';
			})
			.attr('text-anchor', function(d) {
				return midAngle(d) < Math.PI ? 'start' : 'end';
			});
			
	svg.append('g')
		.attr('class', 'lines');
	svg.select('.lines').selectAll('polyline')
			.data(pie(data))
		.enter().append('polyline')
			.attr('points', function(d) {
				var pos = outerArc.centroid(d);
				pos[0] = radius * 0.95 * (midAngle(d) < Math.PI ? 1 : -1);
				return [arc.centroid(d), outerArc.centroid(d), pos]
			});
}


/**
 * Plots a bar graph with the given data
 * @param {d3.selection} $chart - d3 handle to the location of where to 
 * 	draw the graph
 * @param {array} data - array of objects from which to create the graph
 * @returns {void}
 */
function plotBarChart($chart, data) {
	var label_height = d3.max(data, function(d) { return d._id.length; }) * 5, 
		margin = { top: 20, right: 0, bottom: label_height, left: 40},
		width = 960 - margin.right - margin.left,
		height = 800 - margin.top - margin.bottom;
	var x = d3.scale.ordinal()
			.rangeRoundBands([0, width], 0.1)
			.domain(data.map(function(d) { return d._id; })),
		y = d3.scale.linear()
			.range([height, 0])
			.domain([0, d3.max(data, function(d) { return d.count; }) ]);
	var xAxis = d3.svg.axis()
			.scale(x)
			.orient('bottom'),
		yAxis = d3.svg.axis()
			.scale(y)
			.orient('left')
			.ticks(10);
	var svg = $chart.append('svg')
			.attr('width', width + margin.right + margin.left)
			.attr('height', height + margin.top + margin.bottom)
		.append('g')
			.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
	
	svg.append('g')
		.attr('class', 'x axis')
		.attr('transform', 'translate(0,' + height + ')')
		.call(xAxis)
		.selectAll('text')
			.attr('class', 'school-label')
			.style('text-anchor', 'end')
			.attr('dx', '-0.8em')
			.attr('dy', '-0.15em')
			.attr('transform', 'rotate(-65)');
	
	svg.append('g')
			.attr('class', 'y axis')
			.call(yAxis)
		.append('text')
			.attr('transform', 'rotate(-90)')
			.attr('y', 6)
			.attr('dy', '.71em')
			.style('text-anchor', 'end')
			.text('Count');
	
	svg.selectAll('.bar')
			.data(data)
		.enter().append('rect')
			.attr('class', 'bar')
			.attr('x', function(d) { return x(d._id); })
			.attr('width', x.rangeBand())
			.attr('y', function(d) { return y(d.count); })
			.attr('height', function(d) { return height - y(d.count); })
			.on('mouseover', function(d) {
				d3.selectAll('.count-label')
					.filter(function(g) {
						return g._id === d._id;
					})
					.style('font-weight', 'bold');
				d3.selectAll('.school-label')
					.filter(function(g) {
						return g === d._id;
					})
					.style('font-weight', 'bold');
			})
			.on('mouseout', function(d) {
				d3.selectAll('.count-label')
					.filter(function(g) {
						return g._id === d._id;
					})
					.style('font-weight', '');
				d3.selectAll('.school-label')
					.filter(function(g) {
						return g === d._id;
					})
					.style('font-weight', '');
			});
	
	svg.selectAll('.count-label')
			.data(data)
		.enter().append('text')
			.attr('class', 'count-label')
			.attr('x', function(d) { return x(d._id) + x.rangeBand()/2; })
			.attr('y', function(d) { return y(d.count) - 5; })
			.style('text-anchor', 'middle')
			.text(function(d) { return d.count; });
}


/**
 * Updates the page with the latest event stats.
 */
function getEventStats() {
	$.get('/data/stats/num_registered')
		.done(function(res) {
			$('.event-stats .num-registered').text(res);
		});
	$.get('/data/stats/num_accepted')
		.done(function(res) {
			$('.event-stats .num-accepted').text(res);
		});
	$.get('/data/stats/num_confirmed')
		.done(function(res) {
			$('.event-stats .num-confirmed').text(res);
		});
}


/**
 * Helper function to filter an array of values
 * @param {array} array of values to filter
 * @param {function} function that returns a boolean when evaluated 
 * at each value in the list
 * @returns {array} the filtered array
 */
function filter(list, predicate) {
	var result = [];
	list.forEach(function(d) { 
		if (predicate(d)) {
			result.push(d);
		}
	});
	return result;
}