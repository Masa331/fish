function backup() {
  const fileName = `fish_backup_${iso8601Date(new Date())}.json`;
  const content = rawEntries();

  const element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
  element.setAttribute('download', fileName);

  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

function restore(event) {
  event.target.files[0].text()
    .then((content) => {
      localStorage.setItem(STORAGE_KEY, content);
    });
}
