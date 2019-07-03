// curl -o d3.js https://d3js.org/d3.v5.js
// curl -o d3-legend.js https://cdnjs.cloudflare.com/ajax/libs/d3-legend/2.25.6/d3-legend.js
// curl -o date_fns.js https://cdnjs.cloudflare.com/ajax/libs/date-fns/1.30.1/date_fns.js

// npm show d3 dist-tags
// npm show d3-svg-legend dist-tags
// npm show date-fns dist-tags

// see https://bl.ocks.org/mbostock/3883245
const renderChart = (data, dates, dim, zeroed) => {
  const w = 300;
  const h = 125;
  let svg = d3.select(document.getElementById(dim));
  const margin = { top: 10, right: 40, bottom: 30, left: 10 };
  const width = w - margin.left - margin.right;
  const height = h - margin.top - margin.bottom;
  let g = svg
    .attr("width", w)
    .attr("height", h)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);
  let x = d3.scaleTime().rangeRound([0, width]);
  let y = d3.scaleLinear().rangeRound([height, 0]);
  let line = d3
    .line()
    .x(d => x(d.date))
    .y(d => y(d[dim]));
  const plate25kgs = "rgb(151, 70, 59)";
  const plate20kgs = "rgb(82, 89, 155)";
  const plate10kgs = "rgb(55, 106, 48)";
  const color = d3
    .scaleOrdinal()
    .domain(["overall", "distance", "speed", "time"])
    .range([plate25kgs, "#444", plate20kgs, plate10kgs]);
  x.domain(dates);
  const series = data.map(d => d[dim]);
  y.domain([zeroed ? 0 : d3.min(series), d3.max(series)]);
  g.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(5))
    .select(".domain")
    .remove();
  g.append("g")
    .attr("transform", `translate(${width},0)`)
    .call(d3.axisRight(y).ticks(5))
    .append("text")
    .attr("fill", "#000")
    .attr("transform", "rotate(-90)")
    .attr("x", -height)
    .attr("y", -8)
    .attr("dy", "0.51em")
    .attr("text-anchor", "start")
    .text(
      dim === "distance"
        ? "distance (miles)"
        : dim === "time"
        ? "time (minutes)"
        : dim === "overall"
        ? "overall (miles)"
        : dim === "speed"
        ? "speed (mph)"
        : dim
    );
  g.append("path")
    .datum(data)
    .attr("class", "line")
    .attr("fill", "none")
    .attr("stroke", color(dim))
    .attr("stroke-linejoin", "round")
    .attr("stroke-linecap", "round")
    .attr("stroke-width", 1.5)
    .attr("d", line);
  g.selectAll("circle")
    .data(data)
    .enter()
    .append("circle")
    .attr("fill", color(dim))
    .attr("cx", d => x(d.date))
    .attr("cy", d => y(d[dim]))
    .attr("r", 2)
    .append("title")
    .text(d => `${d[dim].toLocaleString("en-US", { maximumFractionDigits: 1 })}\n${d.date}`);
};

const getAggs = d => {
  const aggs = d3
    .nest()
    .key(r => +r.date)
    .rollup(a => {
      const time = d3.sum(a, e => e.time);
      const distance = d3.sum(a, e => e.distance);
      return {
        time,
        distance,
        speed: (60 * distance) / time
      };
    })
    .entries(d)
    .map(({ key, value }) => ({
      date: new Date(+key),
      ...value
    }));
  // TODO consider washing this into aggs
  const overallData = aggs.reduce((memo, { date, distance }) => {
    const { overall } = memo.length ? memo[memo.length - 1] : { overall: 0 };
    memo.push({ date, overall: overall + distance });
    return memo;
  }, []);
  // TODO consider doing an overall speed too
  return { aggs, overallData };
};

const linkURL = search => {
  let url = new URL(document.location);
  url.search = search;
  return url.toString();
};

// assume the csv is in the correct order so no sorting needed
d3.csv("biking-2019.csv", r => {
  return {
    // assume date parse is sensible
    date: new Date(r.date),
    distance: Number(r.distance.split(" ")[0]),
    time: Number(r.time.split(" ")[0]),
    route: r.route,
    bike: r.bike
  };
}).then(d => {
  let u = new URL(document.location);
  let zeroed = null != u.searchParams.get("zero");
  document.getElementById("variants").innerHTML = `<p>Showing ${
    zeroed ? "zeroed" : "Data based"
  } scale</p>
  <p><a href='${linkURL("")}'>Scale Min based on Data</a></p>
  <p><a href='${linkURL("?zero")}'>Scale Min at Zero</a></p>`;
  const miles = d3.sum(d, r => r.distance);
  document.getElementById("miles").innerHTML = miles.toLocaleString("en-US", {
    maximumFractionDigits: 0
  });

  const { aggs, overallData } = getAggs(d);
  const dates = d3.extent(d, r => r.date);

  renderChart(overallData, dates, "overall", zeroed);
  renderChart(aggs, dates, "distance", zeroed);
  renderChart(aggs, dates, "time", zeroed);
  renderChart(aggs, dates, "speed", zeroed);
  console.log(aggs);
  console.log(overallData);
  // return;

  const weekAdjust = d => {
    // push last and first week weirdness off of ISO standards see
    // https://en.wikipedia.org/wiki/ISO_week_date#First_week
    const isoWeek = dateFns.getISOWeek(d);
    const month = dateFns.getMonth(d);
    if (month === 11 && isoWeek === 1) {
      return 53;
    } else if (month === 0 && isoWeek >= 52) {
      return 0;
    } else {
      return isoWeek;
    }
  };
  const [minWeek, maxWeek] = d3.extent(d.map(r => weekAdjust(r.date)));
  const colorScales = {
    time: d3
      .scaleThreshold()
      .domain([50, 100, 150, 200])
      .range(d3.schemeBuPu[5]),
    distance: d3
      .scaleThreshold()
      .domain([10, 20, 30, 40])
      .range(d3.schemeBuPu[5])
  };
  const calData = d3
    .nest()
    .key(r => weekAdjust(r.date))
    .key(r => dateFns.getISODay(r.date))
    .rollup(a => ({
      time: d3.sum(a, e => e.time),
      distance: d3.sum(a, e => e.distance)
    }))
    .object(d);
  const calWH = 20;
  const calWidth = calWH * (maxWeek - minWeek + 1) + "px";
  const calHeight = calWH * 8 + "px";
  let calTimeRoot = d3
    .select(".cal-grid-time")
    .style("width", calWidth)
    .style("height", calHeight);
  let calDistanceRoot = d3
    .select(".cal-grid-distance")
    .style("width", calWidth)
    .style("height", calHeight);
  const days = [null, "Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
  const appendDays = (root, d, i, j, f) => {
    const val = ((d[i] || {})[j] || {})[f] || 0;
    root
      .append("div")
      .style("background", colorScales[f](val))
      .style("width", calWH - 4 + "px")
      .style("padding-right", "2px")
      .style("height", calWH - 2 + "px")
      .style("left", (i - minWeek) * calWH + "px")
      .style("top", j * calWH + "px")
      .attr("title", val.toLocaleString("en-US", { maximumFractionDigits: 2 }))
      .text(i !== 0 ? (j === 0 ? i : null) : days[j]);
  };
  for (let i = minWeek; i <= maxWeek; i++) {
    for (let j = 0; j <= 7; j++) {
      appendDays(calTimeRoot, calData, i, j, "time");
      appendDays(calDistanceRoot, calData, i, j, "distance");
    }
  }
  let svg = d3.select("svg#cal-legend-time");
  svg
    .attr("width", 160)
    .attr("height", calHeight)
    .append("g")
    .attr("class", "legendThreshold")
    .attr("transform", "translate(15,10)");
  let legend = d3
    .legendColor()
    .labelFormat(".2r")
    .labels(d3.legendHelpers.thresholdLabels)
    .shapeWidth(calWH - 2)
    .shapeHeight(calWH - 2)
    .scale(colorScales.time);
  svg.select(".legendThreshold").call(legend);
  svg = d3.select("svg#cal-legend-distance");
  svg
    .attr("width", 160)
    .attr("height", calHeight)
    .append("g")
    .attr("class", "legendThreshold")
    .attr("transform", "translate(15,10)");
  legend = d3
    .legendColor()
    .labelFormat(".2r")
    .labels(d3.legendHelpers.thresholdLabels)
    .shapeWidth(calWH - 2)
    .shapeHeight(calWH - 2)
    .scale(colorScales.distance);
  svg.select(".legendThreshold").call(legend);
});
