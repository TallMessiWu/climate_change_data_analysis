d3.select("#plot").append("div").attr("id", "scatterplot");
d3.select("#plot").append("div").attr("id", "barplot");

async function drawGraph() {
    data = await d3.csv("https://raw.githubusercontent.com/TallMessiWu/climate_change_data_analysis/main/data/cleaned_and_ready/wide_data.csv");

    // get rid of the index and color column
    data = data.map(d => {
        delete d[""];
        delete d["color"]
        return d;
    });

    // Convert to numbers for the columns that are not country name and income group
    data = data.map(d => {
        for (const [key, value] of Object.entries(d)) {
            if (key !== "Country_name" && key !== "Income_group") {
                if (isNaN(value)) {
                    d[key] = NaN;
                } else {
                    d[key] = Math.round(+value * 100) / 100;
                }
            }
        }
        return d;
    });

    // Other than CO2 emissions per capita and Energy use per capita, convert to z-score

    data = data.map(d => {
        for (const [key, value] of Object.entries(d)) {
            if (key !== "Country_name" && key !== "Income_group" && key !== "CO2 emissions per capita (metric tons)" && key !== "Energy use per capita (kilograms of oil equivalent)") {
                let z_score = (value - d3.mean(data, d => d[key])) / d3.deviation(data, d => d[key]);
                d[key] = Math.round(z_score * 100) / 100;
            }
        }
        return d;
    })

    // all z scores for all columns that are not CO2 emissions per capita, Energy use per capita, Country_name, and Income_group
    let z_scores = data.map(d => {
        for (const [key, value] of Object.entries(d)) {
            if (key !== "Country_name" && key !== "Income_group" && key !== "CO2 emissions per capita (metric tons)" && key !== "Energy use per capita (kilograms of oil equivalent)") {
                return value;
            }
        }
    })

    let min_z_score = d3.min(z_scores);
    let max_z_score = d3.max(z_scores);

    let columns = Object.keys(data[0]);
    columns = columns.filter(d => d !== "Country_name" && d !== "Income_group" && d !== "CO2 emissions per capita (metric tons)" && d !== "Energy use per capita (kilograms of oil equivalent)")
    columns = columns.map(d => {
        if (d.includes("(")) {
            d = d.split("(")[0].trim()
        }
        return d;
    })

    // draw scatter plot
    plot_data = data.map(d => {
        return {
            "country_name": d["Country_name"],
            "CO2_emissions": d["CO2 emissions per capita (metric tons)"],
            "energy_use": d["Energy use per capita (kilograms of oil equivalent)"],
            "income_group": d["Income_group"]
        }
    })

    // remove nan values
    plot_data = plot_data.filter(d => !isNaN(d.CO2_emissions) && !isNaN(d.energy_use))

    // draw scatter plot
    // canvas
    let width = 650;
    let height = 650;
    let margin = {top: 20, right: 20, bottom: 70, left: 70};

    const plot = d3.select("#scatterplot").append("svg")
        .attr("width", width)
        .attr("height", height)

    // scales
    const xScale = d3.scaleLinear()
        .domain(d3.extent(plot_data, d => d.energy_use))
        .range([margin.left, width - margin.right]);

    const yScale = d3.scaleLinear()
        .domain(d3.extent(plot_data, d => d.CO2_emissions))
        .range([height - margin.bottom, margin.top]);


    // find unique income groups
    const incomeGroups = ['Low income', 'Lower middle income', 'Upper middle income', 'High income: OECD', 'High income: nonOECD'];
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10).domain(incomeGroups);

    // draw legend
    // canvas
    const legend = plot.append("g")
        .attr("transform", `translate(${width - margin.right - 150}, ${margin.top + 400})`)
        .attr("id", "legend");
    // rectangles
    legend.selectAll("rect")
        .data(incomeGroups)
        .enter()
        .append("rect")
        .attr("x", 0)
        .attr("y", (d, i) => i * 20)
        .attr("width", 10)
        .attr("height", 10)
        .attr("fill", d => colorScale(d))
    // texts
    legend.selectAll("text")
        .data(incomeGroups)
        .enter()
        .append("text")
        .attr("x", 20)
        .attr("y", (d, i) => i * 20 + 10)
        .text(d => d)
        .attr("font-size", 10)
        .attr("alignment-baseline", "middle")


    // draw axis
    const xAxis = d3.axisBottom().scale(xScale);
    const yAxis = d3.axisLeft().scale(yScale);
    // add axis to plot
    plot.append("g")
        .attr("transform", `translate(0, ${height - margin.bottom})`)
        .call(xAxis);

    plot.append("g")
        .attr("transform", `translate(${margin.left}, 0)`)
        .call(yAxis);
    // add axis labels
    plot.append("text")
        .attr("x", width / 2 - 110)
        .attr("y", height - margin.bottom + 40)
        .text("CO2 emissions per capita (metric tons)")

    plot.append("text")
        .attr("x", -height / 2 - 150)
        .attr("y", margin.left - 50)
        .attr("transform", "rotate(-90)")
        .text("Energy use per capita (kilograms of oil equivalent)")

    // add an empty barplot for now
    d3.select("#barplot").append("svg")
        .attr("width", width)
        .attr("height", height)

    // draw points
    plot.selectAll("circle")
        .data(plot_data)
        .enter()
        .append("circle")
        .attr("cx", d => xScale(d.energy_use))
        .attr("cy", d => yScale(d.CO2_emissions))
        .attr("r", 5)
        .attr("fill", d => colorScale(d.income_group))
        .attr("opacity", 0.5)
        .on("mouseover", function (event, d) {
            d3.select(this)
                .attr("r", 10)
                .attr("opacity", 1)

            // create tooltip
            d3.select("#scatterplot").append("div")
                .attr("id", "tooltip")
                .style("position", "absolute")
                .style("z-index", "10")
                .style("background-color", "white")
                .style("border", "solid")
                .style("padding-left", "10px")
                .style("padding-right", "10px")

            // configure hover tooltip
            d3.select("#tooltip")
                .html(`<p>Country: ${d.country_name}</p>
                            <p>Energy use capita: ${d.energy_use}</p>
                          <p>CO2 emissions per capita: ${d.CO2_emissions}</p>`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 10) + "px")

            // draw barplot
            country_data = data.filter(row => row.Country_name === d.country_name)[0]
            drawBarplot(country_data, min_z_score, max_z_score, columns)

        })
        .on("mouseout", function (d) {
            d3.select(this)
                .attr("r", 5)
                .attr("opacity", 0.5)
            // remove tooltip
            d3.select("#tooltip").remove()
        })
}

function drawBarplot(data, min_z_score, max_z_score, columns) {
    // remove previous barplot
    d3.select("#barplot").selectAll("svg").remove()

    // copy data to avoid mutating the original data
    data = {...data}

    const country_name = data.Country_name
    const income_group = data.Income_group

    // remove CO2 emissions per capita, energy use per capita, Country_name, and Income_group
    delete data["CO2 emissions per capita (metric tons)"]
    delete data["Energy use per capita (kilograms of oil equivalent)"]
    delete data["Country_name"]
    delete data["Income_group"]

    // filter nan values
    data = Object.entries(data).filter(d => !isNaN(d[1]))

    // rename column names by only including the first part of the name
    data = data.map(d => {
        if (d[0].includes("(")) {
            d[0] = d[0].split("(")[0].trim()
        }
        return d;
    })

    // sort data by column name
    data = data.sort((a, b) => {
        if (a[0] < b[0]) {
            return -1
        } else {
            return 1
        }
    })

    // canvas
    let width = 650;
    let height = 650;
    let margin = {top: 80, right: 100, bottom: 200, left: 70};

    const plot = d3.select("#barplot").append("svg")
        .attr("width", width)
        .attr("height", height)

    // scales
    const xScale = d3.scaleBand()
        .domain(columns)
        .range([margin.left, width - margin.right])
        .padding(0.1);

    const yScale = d3.scaleLinear()
        .domain([min_z_score, max_z_score])
        .range([height - margin.bottom, margin.top]);

    const incomeGroups = ['Low income', 'Lower middle income', 'Upper middle income', 'High income: OECD', 'High income: nonOECD'];
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10).domain(incomeGroups);

    // draw axis
    const xAxis = d3.axisBottom().scale(xScale);
    const yAxis = d3.axisLeft().scale(yScale);
    // add axis to plot
    plot.append("g")
        .attr("transform", `translate(0, ${height - margin.bottom})`)
        .call(xAxis)
        .selectAll("text")
        .attr("transform", "rotate(45)")
        .attr("text-anchor", "start");

    plot.append("g")
        .attr("transform", `translate(${margin.left}, 0)`)
        .call(yAxis);

    // draw bars
    plot.selectAll("rect").data(data)
        .enter()
        .append("rect")
        .attr("x", d => xScale(d[0]))
        .attr("y", d => yScale(d[1]))
        .attr("fill", colorScale(income_group))
        .attr("width", xScale.bandwidth())
        .attr("height", d => height - margin.bottom - yScale(d[1]))


    // add title
    plot.append("text")
        .attr("x", width / 2 - 110)
        .attr("y", margin.top - 10)
        .text(`Country: ${country_name}`)

}

drawGraph();
