function saveEntry(entry) {
  const newEntries = entries();
  newEntries.unshift(entry);

  localStorage.setItem(STORAGE_KEY, JSON.stringify(newEntries));
}

function entries() {
  const content = rawEntries();

  if (content) {
    return JSON.parse(content);
  } else {
    return [];
  }
}

function rawEntries() {
  return localStorage.getItem(STORAGE_KEY);
}

function clearEntries() {
  localStorage.clear();
  rerender();
}
