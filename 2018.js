// curl -o d3.js https://d3js.org/d3.v5.js
// curl -o d3-legend.js https://cdnjs.cloudflare.com/ajax/libs/d3-legend/2.25.6/d3-legend.js
// curl -o date_fns.js https://cdnjs.cloudflare.com/ajax/libs/date-fns/1.29.0/date_fns.js

// console.log(`d3 v${d3.version}`);

// see https://en.wikipedia.org/wiki/Wilks_Coefficient#Equation
// Values for men are:
const a = -216.0475144;
const b = 16.2606339;
const c = -0.002388645;
const d = -0.00113732;
const e = 7.01863e-6;
const f = -1.291e-8;
const lbs_in_kg = 2.20462262185;
// const lbs_in_kg = 2.2;
// Assume kilograms for both bodyweight and lifted amounts
const wilksFormula = (bodyweight, lifted_kg) => {
  const x = bodyweight;
  const denominator =
    a +
    b * x +
    c * Math.pow(x, 2) +
    d * Math.pow(x, 3) +
    e * Math.pow(x, 4) +
    f * Math.pow(x, 5);
  const wilks_coefficient = 500 / denominator;
  return wilks_coefficient * lifted_kg;
};

// see https://bl.ocks.org/mbostock/3883245
const renderChart = (exercise, dim, data, dates, w, h, zeroed) => {
  var svg = d3.select(document.getElementById(`${exercise}-${dim}`));
  svg.selectAll("*").remove();
  var margin = { top: 10, right: 45, bottom: 30, left: 15 },
    width = w - margin.left - margin.right,
    height = h - margin.top - margin.bottom,
    g = svg
      .attr("width", w)
      .attr("height", h)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

  var x = d3.scaleTime().rangeRound([0, width]);

  var y = d3.scaleLinear().rangeRound([height, 0]);

  var line = d3
    .line()
    .x(d => x(d.date))
    .y(d => y(d[dim]));

  const plate25lbs = "rgb(55, 106, 48)";
  const plate55lbs = "rgb(151, 70, 59)";
  const plate45lbs = "rgb(82, 89, 155)";
  const color = d3
    .scaleOrdinal()
    .domain(["deadlift", "squat", "press"])
    .range([plate55lbs, plate45lbs, plate25lbs]);
  x.domain(dates);
  y.domain([
    zeroed ? 0 : d3.min(data[exercise], d => d[dim]),
    d3.max(data[exercise], d => d[dim])
  ]);
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
      dim === "weight"
        ? "max weight (kgs)"
        : dim === "tonnage"
          ? "tons (metric)"
          : dim === "reps"
            ? "reps (total)"
            : dim
    );
  g.append("path")
    .datum(data[exercise])
    .attr("class", "line")
    .attr("fill", "none")
    .attr("stroke", color(exercise))
    .attr("stroke-linejoin", "round")
    .attr("stroke-linecap", "round")
    .attr("stroke-width", 1.5)
    .attr("d", line);
  // see http://alignedleft.com/tutorials/d3/making-a-scatterplot
  // g.selectAll("circle")
  //   // .data(data[exercise])
  //   .enter()
  //   .append("circle")
  //   // .attr("fill", color(exercise))
  //   .attr("cx", d => x(d.date))
  //   .attr("cy", d => y(d[dim]))
  //   .attr("r", 5);
  g.selectAll("path.mark")
    .data(data[exercise])
    .enter()
    .append("path")
    .attr("class", "mark")
    .attr("fill", color(exercise))
    .attr("d", d => {
      const xp = x(d.date);
      const yp = y(d[dim]);
      const di = 9;
      const r = di / 2;
      const h = di / 3;
      // // TODO consider if custom d3.symbol for the high / low / trap makes sense
      // if (d.variant === "high") {
      //   return `M${xp - r},${yp} a1 0.8 0 1 1 ${di} 0`;
      // }
      // if (d.variant === "low") {
      //   return `M${xp - r},${yp} a1 0.8 0 0 0 ${di} 0`;
      // }
      // if (d.variant === "trap") {
      //   return `M${xp -
      //     r},${yp} l${h},-${h}l${h},0l${h},${h}l-${h},${h}l-${h},0l-${h},-${h}`;
      // }
      return `M${xp - r},${yp} a1 1 0 1 1 ${di} 0 M${xp -
        r},${yp} a1 1 0 0 0 ${di} 0`;
    })
    .append("title")
    .text(
      d =>
        `${d[dim].toLocaleString("en-US", { maximumFractionDigits: 1 })}\n${
          d.date
        }`
    );
};

// https://developer.mozilla.org/en-US/docs/Web/Events/resize#requestAnimationFrame_customEvent
(function() {
  var throttle = function(type, name, obj) {
    obj = obj || window;
    var running = false;
    var func = function() {
      if (running) {
        return;
      }
      running = true;
      requestAnimationFrame(function() {
        obj.dispatchEvent(new CustomEvent(name));
        running = false;
      });
    };
    obj.addEventListener(type, func);
  };
  throttle("resize", "optimizedResize");
})();

// assume the csv is in the correct order so no sorting needed
// assume there are only ever 10 sets to pay attention to
const ALL_SETS = d3.range(1, 11).map(s => `set${s}`);
d3.csv("2018.csv", r => {
  const recordedMaxWeight = Number(r["max weight"]);
  let allSets = ALL_SETS.map(s => {
    const raw = r[s] || "";
    if (raw.length === 0) return null;
    const parts = raw.split("x");
    let info = {};
    info.weight = parts.length === 1 ? recordedMaxWeight : Number(parts[0]);
    info.reps = d3.sum(parts[parts.length - 1].split("|").map(n => Number(n)));
    info.tonnage = info.weight * info.reps;
    return info;
  }).filter(d => d);
  return {
    // assume date parse is sensible
    date: new Date(r.date),
    exercise: r.exercise.split(" ")[0],
    variant: r.exercise.split(" ")[1],
    competition:
      r.exercise === "deadlift conventional" ||
      r.exercise === "squat low" ||
      r.exercise === "press overhead" ||
      r.exercise === "bench",
    // assume all weight is input in lbs for now, but shown in kgs or tons
    tonnage: d3.sum(allSets, d => d.tonnage) / lbs_in_kg / 1000,
    weight: d3.max(allSets.map(d => d.weight)) / lbs_in_kg,
    reps: d3.sum(allSets.map(d => d.reps))
  };
}).then(d => {
  let u = new URL(document.location);
  let uc = new URL(document.location);
  let uz = new URL(document.location);
  let ucz = new URL(document.location);
  let showAllOnly = null == u.searchParams.get("comp");
  let zeroed = null != u.searchParams.get("zero");
  u.search = "";
  uc.search = "?comp";
  uz.search = "?zero";
  ucz.search = "?comp&zero";
  if (!showAllOnly) {
    d = d.filter(r => r.competition);
  }
  document.getElementById("variants").innerHTML = `<p>Showing ${
    showAllOnly ? "all variants" : "comp only"
  } ${zeroed ? "zeroed" : ""}</p>
  <p><a href="${u.toString()}">See all variants</a></p>
  <p><a href="${uc.toString()}">See comp only</a></p>
  <p><a href="${uz.toString()}">See all variants zeroed</a></p>
  <p><a href="${ucz.toString()}">See comp only zeroed</a></p>`;
  const tons = d3.sum(d, r => r.tonnage);
  document.getElementById("tons").innerHTML = tons.toLocaleString("en-US", {
    maximumFractionDigits: 0
  });
  const nested = d3
    .nest()
    .key(r => r.exercise)
    .object(d);
  const [startDate, endDate] = d3.extent(d, r => r.date);
  // NOTE this avoids mutating the startDate in the data
  let startOfMonth = new Date(+startDate);
  startOfMonth.setDate(1);
  let dates = [startOfMonth, endDate];
  const maxWeek = d3.max(d.map(r => dateFns.getISOWeek(r.date)));
  const c = d3
    .scaleThreshold()
    .domain([0.1, 1, 2, 3, 4])
    .range(d3.schemeBuPu[6]);
  const calData = d3
    .nest()
    .key(r => dateFns.getISOWeek(r.date))
    .key(r => dateFns.getISODay(r.date))
    .rollup(a => ({
      total: d3.sum(a, e => e.tonnage),
      squat: d3.sum(a.filter(f => f.exercise === "squat"), e => e.tonnage),
      press: d3.sum(a.filter(f => f.exercise === "press"), e => e.tonnage),
      bench: d3.sum(a.filter(f => f.exercise === "bench"), e => e.tonnage),
      deadlift: d3.sum(a.filter(f => f.exercise === "deadlift"), e => e.tonnage)
    }))
    .object(d);
  let calTotalRoot = d3
    .select(".cal-grid-total")
    .style("height", 20 * 8 + "px")
    .style("width", 20 * (maxWeek + 1) + "px");
  let calSquatRoot = d3
    .select(".cal-grid-squat")
    .style("height", 20 * 8 + "px")
    .style("width", 20 * (maxWeek + 1) + "px");
  let calDeadliftRoot = d3
    .select(".cal-grid-deadlift")
    .style("height", 20 * 8 + "px")
    .style("width", 20 * (maxWeek + 1) + "px");
  let calPressRoot = d3
    .select(".cal-grid-press")
    .style("height", 20 * 8 + "px")
    .style("width", 20 * (maxWeek + 1) + "px");
  let calBenchRoot = d3
    .select(".cal-grid-bench")
    .style("height", 20 * 8 + "px")
    .style("width", 20 * (maxWeek + 1) + "px");
  const days = [null, "Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
  const appendDays = (root, d, i, j, f) => {
    const val = ((d[i] || {})[j] || {})[f] || 0;
    root
      .append("div")
      .style("background", c(val))
      .style("width", "16px")
      .style("padding-right", "2px")
      .style("height", "18px")
      .style("left", i * 20 + "px")
      .style("top", j * 20 + "px")
      .attr("title", val.toLocaleString("en-US", { maximumFractionDigits: 2 }))
      .text(i !== 0 ? (j === 0 ? i : null) : days[j]);
  };
  for (let i = 0; i <= maxWeek; i++) {
    for (let j = 0; j <= 7; j++) {
      appendDays(calTotalRoot, calData, i, j, "total");
      appendDays(calSquatRoot, calData, i, j, "squat");
      appendDays(calDeadliftRoot, calData, i, j, "deadlift");
      appendDays(calPressRoot, calData, i, j, "press");
      appendDays(calBenchRoot, calData, i, j, "bench");
    }
  }

  var svg = d3.select("svg#cal-legend");

  svg
    .append("g")
    .attr("class", "legendThreshold")
    .attr("transform", "translate(15,10)");

  var legend = d3
    .legendColor()
    // assume this default label format string
    .labelFormat(".1r")
    .labels(d3.legendHelpers.thresholdLabels)
    // .labels(function({ i, genLength, generatedLabels }) {
    //   let wip = generatedLabels[i];
    //   // work with even 100 values
    //   wip = wip.split("50.0").join("50");
    //   // work with even 1000 values
    //   wip = wip.split("000.0").join("k");
    //   // or with even 500 values
    //   wip = wip.split("500.0").join(".5k");
    //   if (i === 0) {
    //     return wip.replace("NaN to", "Under");
    //   } else if (i === genLength - 1) {
    //     return `More than ${wip.replace(" to NaN", "")}`;
    //   }
    //   return wip;
    // })
    // .shapeWidth(10)
    // .shapeHeight(10)
    .scale(c);

  svg.select(".legendThreshold").call(legend);

  const maxPerExercise = d3
    .nest()
    .key(r => r.exercise)
    .rollup(a => d3.max(a, e => e.weight))
    .object(d);

  // NOTE this only pays attention to the 3 exercises to track the total for
  const maxPressTotal =
    maxPerExercise.press + maxPerExercise.squat + maxPerExercise.deadlift;
  const maxBenchTotal =
    maxPerExercise.bench + maxPerExercise.squat + maxPerExercise.deadlift;
  // hardcoded bodyweight
  const BODY_WEIGHT = 93;
  document.getElementById("wilks-p").innerHTML = wilksFormula(
    BODY_WEIGHT,
    maxPressTotal
  ).toLocaleString("en-US", { maximumFractionDigits: 0 });
  document.getElementById("wilks-b").innerHTML = wilksFormula(
    BODY_WEIGHT,
    maxBenchTotal
  ).toLocaleString("en-US", { maximumFractionDigits: 0 });
  const redraw = () => {
    // magic constants in portrait and landscape respectively are
    // 4 1 2 and 6 8 4
    const windowWidth = window.innerWidth;
    const www = Math.floor((windowWidth - 20) / 3);
    const hhh = Math.floor(www / 2.1);
    const ww = windowWidth - 10;
    const hh = Math.floor(ww / 2.85);
    const IS_NARROW = ww < 684;
    const w = IS_NARROW ? ww : www;
    const h = IS_NARROW ? hh : hhh;
    renderChart("squat", "weight", nested, dates, w, h, zeroed);
    renderChart("deadlift", "weight", nested, dates, w, h, zeroed);
    renderChart("press", "weight", nested, dates, w, h, zeroed);
    renderChart("bench", "weight", nested, dates, w, h, zeroed);
    renderChart("squat", "reps", nested, dates, w, h, zeroed);
    renderChart("deadlift", "reps", nested, dates, w, h, zeroed);
    renderChart("press", "reps", nested, dates, w, h, zeroed);
    renderChart("bench", "reps", nested, dates, w, h, zeroed);
    renderChart("squat", "tonnage", nested, dates, w, h, zeroed);
    renderChart("deadlift", "tonnage", nested, dates, w, h, zeroed);
    renderChart("press", "tonnage", nested, dates, w, h, zeroed);
    renderChart("bench", "tonnage", nested, dates, w, h, zeroed);
  };
  redraw();
  window.addEventListener("optimizedResize", function() {
    redraw();
  });
});
