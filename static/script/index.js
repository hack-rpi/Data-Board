var dataStore = {};

/**
 * Document Ready
 */
$(document).ready(function() {
  getEventStats();
  $('.btn.chart').on('click', onChartButton);
  $('.btn.download').on('click', onDownloadButton);
});


/**
 * Event handler for the buttons to draw the charts
 * @param {Event} JQuery event 
 */
function onChartButton(event) {
  var $btn = $(event.target),
      action = $btn.attr('data-action');
  switch (action) {
    case 'schools':
      $('.school-chart').empty();
      $.get('/data/users/schools')
        .done(function(res) {
          res = JSON.parse(res);
          var filtered = filter(res, function(d) { return d._id && d.count > 0; });
          filtered = filtered.sort(function(a, b) {
            return a._id > b._id;
          });
          $('#num-unique-schools').text(filtered.length);
          dataStore['schools'] = filtered;
          plotBarChart(d3.select('.school-chart'), filtered, 10);
        });
      break;
    case 'zipcodes':
      break;
    case 'why':
      $('.why-chart').empty();
      $.get('/data/users/why')
        .done(function(res) {
          res = JSON.parse(res);          
          var filtered = filter(res, function(d) { return d._id !== null; });
          plotBarChart(d3.select('.why-chart'), filtered, 0);
        });
      break;
    case 'interestAreas':
      $('.interestAreas-chart').empty();
      $.get('/data/users/interestAreas')
        .done(function(res) {
          res = JSON.parse(res);
          console.log(res);
          var filtered = filter(res, function(d) { return d._id !== null; });
          plotBarChart(d3.select('.interestAreas-chart'), filtered, 0);
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
    case 'races':
      $('.race-chart').empty();
      $.get('/data/anonData/races')
        .done(function(res) {
          var filtered = filter(res, function(d) { return d._id !== null; });
          plotPieChart(d3.select('.race-chart'), filtered);
        });
      break;
    default: break;
  }
}


/**
 * 
 */
function onDownloadButton(event) {
  var $btn = $(event.target),
      target = $btn.attr('data-target');
  if (target) {
    var $chart = $('.' + target + ' svg'),
        svg_elems = traverse( $chart[0] );
    for (var i in svg_elems) {
      explicitlySetStyle( svg_elems[i] );
    }
    var a = document.createElement('a'),
        source = 'data:image/svg+xml;base64,' + 
          btoa(
            $chart.attr('version', 1.1)
              .attr('xmlns', 'http://www.w3.org/2000/svg')
              .parent().html()
            );
    a.download = target + '.svg';
    a.href = source;
    a.click();
  }
}


/**
 * 
 */
function explicitlySetStyle (element) {
  var cSSStyleDeclarationComputed = getComputedStyle(element);
  var i, len, key, value;
  var computedStyleStr = "";
  var svg = document.createElement('svg');
  var emptySvgDeclarationComputed = getComputedStyle(svg);
  for (i=0, len=cSSStyleDeclarationComputed.length; i<len; i++) {
      key=cSSStyleDeclarationComputed[i];
      value=cSSStyleDeclarationComputed.getPropertyValue(key);
      if (value!==emptySvgDeclarationComputed.getPropertyValue(key)) {
          computedStyleStr+=key+":"+value+";";
      }
  }
  element.setAttribute('style', computedStyleStr);
}


/**
 * 
 */
function traverse(obj){
  var tree = [];
  tree.push(obj);
  if (obj.hasChildNodes()) {
      var child = obj.firstChild;
      while (child) {
          if (child.nodeType === 1 && child.nodeName != 'SCRIPT'){
              tree.push(child);
          }
          child = child.nextSibling;
      }
  }
  return tree;
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
 * @param {int} top_margin - some annoying parameter to get the bars to line up
 * @returns {void}
 */
function plotBarChart($chart, data, top_margin) {
  var label_length = d3.max(data, function(d) { return d._id.length * 5; });
  var margin = {top: 0, right: 30, bottom: 0, left: label_length};
  var width = 860 - margin.right - margin.left;
  var height = (10 * data.length) - margin.top - margin.bottom;
  var x = d3.scale.linear()
      .range([0, width])
      .domain([0, d3.max(data, function(d) { return d.count; }) ]);
  var y = d3.scale.ordinal()
      .rangeRoundBands([0, height], 0.1)
      .domain(data.map(function(d) { return d._id; }));
  var topOuter = y.range()[0] - top_margin;
  var xAxis = d3.svg.axis()
      .scale(x)
      .orient('bottom');
  var yAxis = d3.svg.axis()
      .scale(y)
      .orient('left')
      .ticks(10);
  var svg = $chart.append('svg')
      .attr('width', width + margin.right + margin.left)
      .attr('height', height + margin.top + margin.bottom)
      .style('margin-bottom', -2 * topOuter + 'px')
    .append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
  
  svg.append('g')
    .attr('class', 'x axis')
    .call(yAxis)
    .attr('transform', 'translate(0, -' + topOuter + ')')
    .selectAll('text')
      .attr('class', 'school-label')
      .style('text-anchor', 'end')
  
  svg.selectAll('.bar')
      .data(data)
    .enter().append('rect')
      .attr('class', 'bar')
      .attr('x', function(d) { return 0; })
      .attr('height', y.rangeBand())
      .attr('y', function(d) { return y(d._id) - topOuter; })
      .attr('width', function(d) { return x(d.count); })
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
      .attr('x', function(d) { return x(d.count) + 2; })
      .attr('y', function(d) { return y(d._id) + y.rangeBand() - topOuter; })
      .style('text-anchor', 'start')
      .text(function(d) { return d.count; });
  
  $('#school-min-count').on('change', function(event) {
    var val = $(event.target).val();
    var data = dataStore['schools'];
    if (data == undefined) {
      return;
    }
    data = filter(data, function(d) { return d.count > val; });
    var label_length = d3.max(data, function(d) { return d._id.length * 5; });
    var height = (10 * data.length) - margin.top - margin.bottom;
    var x = d3.scale.linear()
        .range([0, width])
        .domain([0, d3.max(data, function(d) { return d.count; }) ]);
    var y = d3.scale.ordinal()
        .rangeRoundBands([0, height], 0.1)
        .domain(data.map(function(d) { return d._id; }));
    var topOuter = y.range()[0] - 10;
    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom');
    var yAxis = d3.svg.axis()
        .scale(y)
        .orient('left')
        .ticks(10);
    
    svg.select('.x.axis').remove();
    svg.append('g')
      .attr('class', 'x axis')
      .call(yAxis)
      .attr('transform', function() { return topOuter > 0 ? 'translate(0, -' + topOuter + ')' : '' })
      .selectAll('text')
        .attr('class', 'school-label')
        .style('text-anchor', 'end')

    var bars = svg.selectAll('.bar')
      .data(data);
    bars.exit().remove();
    bars.enter().append('rect')
      .attr('width', 0)
      .attr('height', y.rangeBand())
      .attr('x', 0)
      .attr('y', function(d) { return y(d._id) - topOuter; });
    bars.transition()
      .duration(500)
      .attr('class', 'bar')
      .attr('width', function(d) { return x(d.count); });
    var labels = svg.selectAll('.count-label')
      .data(data);
    labels.exit().remove();
    labels.enter().append('text')
      .attr('x', function(d) { return x(d.count) + 2; })
      .attr('y', function(d) { return y(d._id) + y.rangeBand() - topOuter; })
      .style('text-anchor', 'start')
      .text(function(d) { return d.count; });
    labels.transition()
      .duration(500)    
      .attr('x', function(d) { return x(d.count) + 2; })
      .text(function(d) { return d.count; })
      .attr('class', 'count-label');
    $('#num-unique-schools').text(data.length);

    d3.select('.school-chart').select('svg')
      .attr('height', height + margin.top + margin.bottom)
      .style('margin-bottom', -2 * topOuter + 'px');
  });

}


/**
 * Updates the page with the latest event stats.
 */
function getEventStats() {
  $.get('/data/users/count')
    .done(function(res) {
      $('.event-stats .num-registered').text(res);
    });
  $.get('/data/users/accepted')
    .done(function(res) {
      $('.event-stats .num-accepted').text(res);
    });
  $.get('/data/users/confirmed')
    .done(function(res) {
      $('.event-stats .num-confirmed').text(res);
    });
  $.get('/data/users/checkedin')
    .done(function(res) {
      $('.event-stats .num-checked-in').text(res);
    });
  $.get('/data/users/busStatus')
    .done(function(res) {
      res = JSON.parse(res);
      for (var r in res) {
        var route = res[r];
        var bus_table = '<h3>' + route.RouteID + '</h3><div class="bus">';
        bus_table += '<div><b> Total </b><br>';
        bus_table +=
          '<table>' +
            '<tr> <td>Accepted</td><td>' + route.Accepted + '</td> </tr>' +
            '<tr> <td>Confirmed</td><td>' + route.Confirmed + '</td> </tr>' +
            '<tr> <td>Rejected</td><td>' + route.Rejected + '</td> </tr>' +
            '<tr> <td>Total</td><td>' + route.Total + '</td></tr>' +
          '</table></div>';
        for (var s in route.Stops) {
          var stop = route.Stops[s];
          bus_table += '<div><b>' + stop.StopName + '</b><br>';
          bus_table +=
            '<table>' +
              '<tr> <td>Accepted</td><td>' + stop.Accepted + '</td> </tr>' +
              '<tr> <td>Confirmed</td><td>' + stop.Confirmed + '</td> </tr>' +
              '<tr> <td>Rejected</td><td>' + stop.Rejected + '</td> </tr>' +
              '<tr> <td>Total</td><td>' + stop.Total + '</td></tr>' +
            '</table></div>';
        }
        bus_table += '</div>'
        $('.buses').append(bus_table);
      }
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
