// Javascript standard lib additions

Array.prototype.isEmpty = function() {
  return this.length === 0;
}

Array.prototype.hasAny = function() {
  return this.length > 0;
}

Array.prototype.groupBy = function(keyFunction) {
  const reduceFunction = function(memo, item) {
    const key = keyFunction(item);

    (memo[key] = memo[key] || []).push(item);

    return memo;
  }

  return this.reduce(reduceFunction, {});
}

Array.prototype.unique = function() {
  return [...new Set(this)]
}

Object.prototype.entries = function() {
  return Object.entries(this);
}

Object.prototype.map = function(mapFunction) {
  return this.entries().map(([key, value]) => {
    return mapFunction(key, value);
  });
}

Date.prototype.weekNumber = function() {
  const d = new Date(Date.UTC(this.getFullYear(), this.getMonth(), this.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d - yearStart) / 86400000) + 1)/7)
};

function iso8601Date(date) {
  const parsedDate = new Date(date);
  return parsedDate.toISOString().slice(0, 10);
}
