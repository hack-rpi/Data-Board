/** 
 * Plots a pie chart from the given data
 * @param {d3.selection} $chart - d3 handle to the location of where to 
 * 	draw the chart
 * @param {array} data - array of objects from which to create the chart
 * @returns {void}
 */
function plotPieChart($chart, data) {
	var width = 960,
		height = 500,
		radius = Math.min(width, height) / 2;
	var color = d3.scale.category20();
	var arc = d3.svg.arc()
		.outerRadius(radius - 10)
		.innerRadius(0);
	var pie = d3.layout.pie()
		.value(function(d) { return d.count; });
	var svg = $chart.append('svg')
		.attr('width', width)
		.attr('height', height)
		.append('g')
			.attr('transform', 'translate(' + width/2 + ',' + height/2 + ')');
	var g = svg.selectAll('.arc')
		.data(pie(data))
		.enter().append('g')
			.attr('class', 'arc');
	g.append('path')
		.attr('d', arc)
		.style('fill', function(d, i) { return color(i); });
	g.append('text')
		.attr('transform', function(d) { 
			return 'translate(' + arc.centroid(d) + radius/2 + ')'; })
		.attr('dy', '.35em')
		.style('text-anchor', 'middle')
		.text(function(d) { return d.data._id + ' - ' + d.data.count; });
}

/**
 * Plots a bar graph with the given data
 * @param {d3.selection} $chart - d3 handle to the location of where to 
 * 	draw the graph
 * @param {array} data - array of objects from which to create the graph
 * @returns {void}
 */
function plotBarChart($chart, data) {
	return;
}

$.get('/data/users/schools')
	.done(function(res) {
		plotPieChart(d3.select('.school-chart'), res);
	});
$.get('/data/anonData/genders')
	.done(function(res) {
		plotPieChart(d3.select('.gender-chart'), res);
	});