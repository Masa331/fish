// Events

window.onload = function() {
  rerenderHistory();
};

function totalDuration(total, record) {
  return total + record.duration;
}

function rerenderHistory() {
  const main = document.getElementsByTagName('main')[0];
  while (main.lastChild) {
    main.removeChild(main.lastChild);
  }

  const sortedEntries =
    entries()
    .groupBy((item) => { return iso8601Date(item['date']) })
    .entries()
    .sort((firstEl, secondEl) => { return secondEl > firstEl });

  const dayComponents = sortedEntries.map(([date, records]) => {
    const byTag = records.reduce((memo, record) => {
      if (record.tags.isEmpty()) record.tags.push('#other');

      for (tag of record.tags) {
        const grouping = memo[tag] || { records: [] };

        grouping.records.push(record);
        memo[tag] = grouping;
      };

      return memo;
    }, {});

    const tagComponents = byTag.map((tag, group) => {
      const duration = group.records.reduce(totalDuration, 0);
      return new FishTagSummary(tag, duration, group.records);
    });

    const duration = records.reduce(totalDuration, 0);
    return new FishDay(date, duration, tagComponents);
  });

  const byWeek = dayComponents.groupBy((day) => {
    const parsedDate = new Date(day.date);
    return parsedDate.weekNumber();
  }).entries().sort(([weekNo, _records]) => weekNo);

  const [currentWeekNo, currentWeekDays] = byWeek.shift();
  const duration = currentWeekDays.reduce(totalDuration, 0);
  const currentWeek = new FishCurrentWeek(currentWeekNo, duration, currentWeekDays);
  main.appendChild(currentWeek);

  for ([weekNo, days] of byWeek) {
    const duration = days.reduce(totalDuration, 0);
    const week = new FishWeek(weekNo, duration, days);

    main.appendChild(week);
  }
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

class FishTagSummary extends HTMLElement {
  constructor(tag, duration, records) {
    super();
    this.tag = tag;
    this.duration = duration;

    const template = document.getElementById('fish-tag-summary-template').content;
    this.attachShadow({ mode: 'open' }).appendChild(template.cloneNode(true));

    const descriptions = records.map((record) => {
      return `<p>${formatDuration(record.duration)} ${record.description}</p>`
    }).join('');

    this.innerHTML =
      `<span slot="tag-name">${tag}</span>
             <span slot="duration">${formatDuration(duration)}</span>
             <span slot="records">${descriptions}</span>`

  }
}
customElements.define('fish-tag-summary', FishTagSummary);

class FishDay extends HTMLElement {
  constructor(date, duration, tagComponents) {
    super();
    this.date = date;
    this.duration = duration;
    this.tags = tagComponents;

    const parsedDate = new Date(date);
    const dayName = WEEK_DAY_NAMES[parsedDate.getDay()];

    const template = document.getElementById('fish-day-template').content;
    this.attachShadow({ mode: 'open' }).appendChild(template.cloneNode(true));

    this.innerHTML = `<span slot="date">${iso8601Date(date)} ${dayName}</span><span slot="duration">${formatDuration(duration)}</span>`

    const ul = document.createElement('ul');
    const slotAttr = document.createAttribute('slot');
    slotAttr.value = 'tags';
    ul.setAttributeNode(slotAttr);
    tagComponents.forEach((component) => {
      ul.appendChild(component);
    });
    this.appendChild(ul);
  }
}
customElements.define('fish-day', FishDay);

class FishWeek extends HTMLElement {
  constructor(title, duration, days) {
    super();
    const template = document.getElementById('fish-week-template').content;
    this.attachShadow({ mode: 'open' }).appendChild(template.cloneNode(true));

    const allTags = days.map(day => day.tags).flat();
    const durationByTag = allTags.reduce((memo, fishTag) => {
      memo[fishTag.tag] = (memo[fishTag.tag] || 0) + fishTag.duration;
      return memo;
    }, {})

    const joined =
      durationByTag.entries()
      .sort((duration1, duration2) => duration1[1] < duration2[1])
      .map(([tag, dduration]) => [tag, formatDuration(dduration)].join(' ~ '))
      .join(', ');

    this.innerHTML = `
      <span slot="title">week ${title}</span>
      <span slot="duration">${formatDuration(duration)}</span>
      <div slot="tagTotals">${joined}</>
      `;

    const div = document.createElement('div');
    const slotAttr = document.createAttribute('slot');
    slotAttr.value = 'days';
    div.setAttributeNode(slotAttr);
    days.forEach((component) => {
      div.appendChild(component);
    });
    this.appendChild(div);
  }
}
customElements.define('fish-week', FishWeek);

class FishCurrentWeek extends HTMLElement {
  constructor(title, duration, days) {
    super();
    const template = document.getElementById('fish-current-week-template').content;
    this.attachShadow({ mode: 'open' }).appendChild(template.cloneNode(true));

    this.innerHTML = `
      <span slot="title">current week</span>
      <span slot="duration">${formatDuration(duration)}</span>
      `;

    const div = document.createElement('div');
    const slotAttr = document.createAttribute('slot');
    slotAttr.value = 'days';
    div.setAttributeNode(slotAttr);
    days.forEach((component) => {
      div.appendChild(component);
    });
    this.appendChild(div);
  }
}
customElements.define('fish-current-week', FishCurrentWeek);
