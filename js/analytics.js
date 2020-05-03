'use strict';

window.onload = function() {
  filter();
};

function filter(event) {
  if (event) { event.preventDefault() };

  const grouping = document.querySelector("input[name='grouping']:checked").value;
  const fulltext = document.getElementById("fulltext-filter").value;
  const minDate =  document.getElementById("min-date").value;
  const maxDate =  document.getElementById("max-date").value;

  let entries = FishEntries.all()
  if (fulltext) {
    entries = entries.filter(entry => entry.description.includes(fulltext));
  }
  if (minDate) {
    const date = new Date(minDate);
    entries = entries.filter(entry => entry.date > date);
  }
  if (maxDate) {
    const date = new Date(maxDate);
    date.setHours(23);
    date.setMinutes(59);
    date.setSeconds(59);
    entries = entries.filter(entry => entry.date < date);
  }

  switch (grouping) {
    case 'by-nothing':
      groupByNothing(entries);
      break;
    case 'by-days':
      groupByDays(entries);
      break;
    case 'by-weeks':
      groupByWeeks(entries);
      break;
    case 'by-months':
      groupByMonths(entries);
      break;
  }
}

function groupByNothing(entries) {
  const main = document.getElementById('history');
  while (main.lastChild) { main.removeChild(main.lastChild) };

  let totalDuration = 0;

  const byTag = entries.reduce((memo, record) => {
    totalDuration += record.duration;

    for (const tag of record.tags) {
      const group = memo[tag] || { tag: tag, duration: 0, descriptions: [] };

      group.duration += record.duration;
      group.descriptions.push(`${formatDuration(record.duration)} ${record.description}`);

      memo[tag] = group;
    };

    return memo;
  }, {}).entries().sort((tag1, tag2) => parseInt(tag2[1].duration) > parseInt(tag1[1].duration));

  const tagComponents = byTag.map(([tag, group]) => {
    const descriptions = group.descriptions.map(description => `<p>${description}</p>`).join('');

    const markup = `
      <details>
        <summary>${tag} ~ ${formatDuration(group.duration)}</summary>
        ${descriptions}
      </details>
    `;

    return markup;
  }).join('');

  const markup = `
    <section>
      <h2>all time ~ ${formatDuration(totalDuration)}</h2>
      <div class="row">
        <div class="col-2">
          ${tagComponents}
        </div>

        <figure class="col-10 figure js-chart">
          <figcaption class="figure-caption">hours per tag</figcaption>
        </figure>
      </div>
    </section>
  `;

  main.insertAdjacentHTML('beforeend', markup);
  appendChart(byTag.map(d => d[1]));
}

function groupByDays(entries) {
  const main = document.getElementById('history');
  while (main.lastChild) { main.removeChild(main.lastChild) };

  const groupedAndSorted = entries.groupBy(entry => entry.date.iso8601()).entries()
    .sort((firstEl, secondEl) => secondEl[0] > firstEl[0]);

  groupedAndSorted.forEach(([isoDate, entries]) => {
    let totalDuration = 0;
    const date = entries.first().date;
    const weekDay = date.dayName();

    const byTag = entries.reduce((memo, record) => {
      totalDuration += record.duration;

      for (const tag of record.tags) {
        const group = memo[tag] || { tag: tag, duration: 0, descriptions: [] };

        group.duration += record.duration;
        group.descriptions.push(`${formatDuration(record.duration)} ${record.description}`);

        memo[tag] = group;
      };

      return memo;
    }, {}).entries().sort((tag1, tag2) => parseInt(tag2[1].duration) > parseInt(tag1[1].duration));

    const tagComponents = byTag.map(([tag, group]) => {
      const descriptions = group.descriptions.map(description => `<p>${description}</p>`).join('');

      const markup = `
        <details>
          <summary>${tag} ~ ${formatDuration(group.duration)}</summary>
          ${descriptions}
        </details>
      `;

      return markup;
    }).join('');

    const markup = `
      <section>
        <h2>${isoDate} - ${weekDay} ~ ${formatDuration(totalDuration)}</h2>
        <div class="row">
          <div class="col-2">
            ${tagComponents}
          </div>

          <figure class="col-auto figure js-chart">
            <figcaption class="figure-caption">hours per tag</figcaption>
          </figure>
        </div>
      </section>
    `;

    main.insertAdjacentHTML('beforeend', markup);
    appendChart(byTag.map(d => d[1]));
  });
}


function groupByWeeks(entries) {
  const main = document.getElementById('history');
  while (main.lastChild) { main.removeChild(main.lastChild) };

  const groupedAndSorted = entries.groupBy(entry => entry.date.weekNumber())
    .entries()
    .sort((firstEl, secondEl) => parseInt(secondEl[0]) > parseInt(firstEl[0]));

  groupedAndSorted.forEach(([weekNumber, entries]) => {
    let totalDuration = 0;
    const date = entries.first().date;

    const byTag = entries.reduce((memo, record) => {
      totalDuration += record.duration;

      for (const tag of record.tags) {
        const group = memo[tag] || { tag: tag, duration: 0, descriptions: [] };

        group.duration += record.duration;
        group.descriptions.push(`${formatDuration(record.duration)} ${record.description}`);

        memo[tag] = group;
      };

      return memo;
    }, {}).entries().sort((tag1, tag2) => parseInt(tag2[1].duration) > parseInt(tag1[1].duration));

    const tagComponents = byTag.map(([tag, group]) => {
      const descriptions = group.descriptions.map(description => `<p>${description}</p>`).join('');

      const markup = `
        <details>
          <summary>${tag} ~ ${formatDuration(group.duration)}</summary>
          ${descriptions}
        </details>
      `;

      return markup;
    }).join('');

    const weekBoundaries = weekBoundaryDates(weekNumber).map(d => d.iso8601()).join(' - ');
    const markup = `
      <section>
        <h2>${weekBoundaries}, week ${weekNumber.slice(4)} ~ ${formatDuration(totalDuration)}</h2>
        <div class="row">
          <div class="col-2">
            ${tagComponents}
          </div>

          <figure class="col-auto figure js-chart">
            <figcaption class="figure-caption">hours per tag</figcaption>
          </figure>
        </div>
      </section>
    `;

    main.insertAdjacentHTML('beforeend', markup);
    appendChart(byTag.map(d => d[1]));
  });
}

function groupByMonths(entries) {
  const main = document.getElementById('history');
  while (main.lastChild) { main.removeChild(main.lastChild) };

  const groupedAndSorted = entries.groupBy(entry => entry.date.monthName())
    .entries()
    .sort((firstEl, secondEl) => parseInt(secondEl[0]) > parseInt(firstEl[0]));

  groupedAndSorted.forEach(([monthName, entries]) => {
    let totalDuration = 0;
    const date = entries.first().date;

    const byTag = entries.reduce((memo, record) => {
      totalDuration += record.duration;

      for (const tag of record.tags) {
        const group = memo[tag] || { tag: tag, duration: 0, descriptions: [] };

        group.duration += record.duration;
        group.descriptions.push(`${formatDuration(record.duration)} ${record.description}`);

        memo[tag] = group;
      };

      return memo;
    }, {}).entries().sort((tag1, tag2) => parseInt(tag2[1].duration) > parseInt(tag1[1].duration));;

    const tagComponents = byTag.map(([tag, group]) => {
      const descriptions = group.descriptions.map(description => `<p>${description}</p>`).join('');

      const markup = `
        <details>
          <summary>${tag} ~ ${formatDuration(group.duration)}</summary>
          ${descriptions}
        </details>
      `;

      return markup;
    }).join('');

    const markup = `
      <section>
        <h2>${monthName} ~ ${formatDuration(totalDuration)}</h2>
        <div class="row">
          <div class="col-2">
            ${tagComponents}
          </div>

          <figure class="col-auto figure js-chart">
            <figcaption class="figure-caption">hours per tag</figcaption>
          </figure>
        </div>
      </section>
    `;

    main.insertAdjacentHTML('beforeend', markup);
    appendChart(byTag.map(d => d[1]));
  });
}

function appendChart(rawData) {
  const data = rawData.map(d => {
    d.durationInHours = d.duration / 60 / 60;
    return d;
  });
  const margin = { top: 20, right: 10, bottom: 10, left: 30 };
  const width = data.length * 40 + margin.left + margin.right;
  const height = 200;

  const yMax = d3.max([12, d3.max(data, d => d.durationInHours)]);
  const y = d3.scaleLinear()
    .domain([0, yMax])
    .range([height - margin.bottom, margin.top]);

  const x = d3.scaleBand()
    .domain(data.map(d => d.tag))
    .range([margin.left, (data.length * 40) + margin.left])
    .padding(0.3);

  const main = d3.selectAll('section:last-of-type .js-chart');
  const svg =
    main.append('svg')
    .attr('class', 'hours-by-tag-chart border-top')
    .attr('width', '100%')
    .attr('viewBox', `0 0 ${width} 200`);

  svg.append('g')
    .attr('transform', `translate(0, ${height - margin.bottom})`)
    .attr('class', 'x-axis')
    .call(d3.axisBottom(x))
    .attr('text-anchor', 'start')

  svg.append('g')
    .attr('transform', `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(y).ticks(4));

  svg.append('g')
    .attr('fill', 'steelblue')
    .selectAll('rect')
    .data(data)
    .join('rect')
    .attr('x', d => x(d.tag))
    .attr('y', d => y(d.durationInHours))
    .attr('height', d => y(0) - y(d.durationInHours))
    .attr('width', x.bandwidth());
}

function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) {
    return '0s';
  } else if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds >= 60 && seconds < 3600) {
    return `${Math.round(seconds / 60)}m`;
  } else if (seconds >= 3600) {
    return `${parseFloat((seconds / 60 / 60).toFixed(2))}h`;
  } else {
    return '0s';
  }
}

function weekBoundaryDates(yearWeek) {
  var curr = new Date(parseInt(yearWeek.slice(0, 4)), 0, parseInt(yearWeek.slice(4)) * 7);

  var first = curr.getDate() - curr.getDay();
  var last = first + 6;
  const firstday = new Date(curr.setDate(first + 1));
  const lastday = new Date(curr.setDate(curr.getDate()+6));

  return [firstday, lastday];
}
