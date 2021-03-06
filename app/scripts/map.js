var zoom = d3.behavior.zoom()//----------
    .scaleExtent([1, 9])
    .on("zoom", move); 
    
function move() {//---------

  var t = d3.event.translate;
  var s = d3.event.scale; 
  zscale = s;
  var h = map.height/4;


  t[0] = Math.min(
    (map.width/map.height)  * (s - 1), 
    Math.max( map.width * (1 - s), t[0] )
  );

  t[1] = Math.min(
    h * (s - 1) + h * s, 
    Math.max(map.height  * (1 - s) - h * s, t[1])
  );

  zoom.translate(t);
  map.svg.attr("transform", "translate(" + t + ")scale(" + s + ")");

  //adjust the country hover stroke width based on zoom level
  d3.selectAll(".country").style("stroke-width", 1.5 / s);

}
    							

function Map( id ){
     self = this;
    this.element = d3.select(id);

    this.width  = document.getElementById('map').offsetWidth;
    this.height = document.getElementById('map').offsetHeight;

    var projection = d3.geo.mercator()
    	.translate([(this.width/2)-30, (this.height/2)+50])
    	.scale( this.width / 2 / Math.PI);

    var path = d3.geo.path().projection(projection);
    this.path = path;

    var svg = this.element.append("svg")
      .attr("width", this.width)
      .attr("height", this.height)
      .call(zoom)
      .append("g");

    this.svg = svg;

    var tooltip = this.element
        .select("div.tooltip");

    this.tooltip = tooltip;

    var tooltipTemplate = this.tooltip.select(".wrapper").html();
    this.tooltipTemplate = Handlebars.compile( tooltipTemplate );

    this.topo = null;
}


Map.prototype.draw = function(){
    var self     = this;
    var country = this.svg
        .selectAll(".country").data(this.topo);

    var path = this.path;

    this.svg.append("path")
       .datum({type: "LineString", coordinates: [[-180, 0], [-90, 0], [0, 0], [90, 0], [180, 0]]})
       .attr("class", "equator")
       .attr("d", path);

    country.enter().insert("path")
        .attr("class", "country")
        .attr("d", path )
        .attr("id", function(d,i) { return d.id; })
        .attr("title", function(d,i) { return d.properties.name; })
        .classed("valid-country", function(d){ return asylum[d.properties.name]; });

	country.on("click", this.onClick );

}

Map.prototype.addToolTip = function(year){
	var self = this;
	country = this.svg
				  .selectAll(".country");
	 //offsets for tooltips
    var boundary = this.element.node().getBoundingClientRect();
    var offsetL = boundary.left+20;
    var offsetT = boundary.top+10;
    country.on("mousemove", function(d,i) {
        var name = d.properties.name;
        if( name == self.prevCountry ) { d3.event.stopPropagation(); }

        self.prevCountry = name;

        var mouse = d3.mouse(self.svg.node()).map( function(d) { return parseInt(d); } );

        var pos = d3.select(this).node().getBoundingClientRect();
        var x   = pos.right  - ( pos.right - pos.left )/3;
        var y   = pos.bottom - ( pos.bottom - pos.top )/3;

        self.tooltip.classed("hidden", function(){
                return !asylum[name]
            })
             .attr("style", "left:"+( x ) +"px;top:"+( y )+"px")
             .select(".wrapper")
             .html( function(){
                 var  country = asylum[name];
                 if( !country ){ return "" }

                 var number = d3.format(",")(country[year]['Total']);
                 var rank = _.findIndex( totalYearlyData[year].countries, function(obj){
                     return name == obj.country;
                 });
                 return self.tooltipTemplate(
                     {
                         rank:    ordinal(rank+1),
                         country: name,
                         number:  number
                     }
                 );

             });

      });

}

Map.prototype.colorMap = function(year){
    var self     = this;
    var present = [];

    //Define default colorbrewer scheme
	var colorSchemeSelect = "YlOrBr";
	var colorScheme = colorbrewer[colorSchemeSelect];


	//define default number of quantiles
	var quantiles = 5;

	//Define quantile scale to sort data values into buckets of color
	var color = d3.scale.quantile()
	   .range(colorScheme[quantiles]);

    var colorDomain =  [];
    var minDomain = 999999;
    var maxDomain = 0;
    for (var key in asylum){
    	present.push(key);
    	colorDomain.push[asylum[key][year]["Total"]];
    	if(minDomain > asylum[key][year]["Total"]){
    		minDomain = asylum[key][year]["Total"];
    	}
    	if(maxDomain < asylum[key][year]["Total"]){
    		maxDomain = asylum[key][year]["Total"];
    	}
    }

    color.domain([minDomain,maxDomain]);
    this.svg
        .selectAll(".country")
        .style("fill", function(d, i) {
            if(asylum[d.properties.name]){
                return color(asylum[d.properties.name][year]['Total']);
            }
            return "#DDE7EB";
        });


    this.svg.selectAll('g.legend').remove("g.legend");

    var legend = this.svg.selectAll('g.legend')
		.data(color.range())
		.enter()
		.append('g').attr('class', 'legend');


    var legendX = 10;
    var legendY = this.height - 23* quantiles;

	legend.append('rect')
		.attr("x", legendX )
		.attr("y", function(d, i) {
		   return (legendY +(i * 20));
		})
	   .attr("width", 10)
	   .attr("height", 10)
	   .style("stroke", "black")
	   .style("stroke-width", 1)
	   .style("fill", function(d){return d;});
		   //the data objects are the fill colors
    legend.append("text")
        .attr("class", "legend-header")
        .attr("x", legendX )
        .attr("y", legendY - 10 )
        .html("Number of requests");

	legend.append('text')
		.attr("x", legendX + 15 ) //leave 5 pixel space after the <rect>
		.attr("y", function(d, i) {
		   return (legendY+(i * 20));
		})
		.attr("dy", "0.8em") //place text one line *below* the x,y point
		.text( function(d,i) {
		    var extent = color.invertExtent(d);
		    //extent will be a two-element array, format it however you want:
		    var format = d3.format(".2s");
		    return format(+extent[0]) + " - " + format(+extent[1]);
		});

    this.addToolTip(year);

}
