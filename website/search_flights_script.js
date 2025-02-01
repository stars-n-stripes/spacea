
const searchBoxOrigin = document.getElementById('search-box-origin');
const suggestionsDivOrigin = document.getElementById('suggestions-origin');
const searchBoxDest = document.getElementById('search-box-dest');
const suggestionsDivDest = document.getElementById('suggestions-dest');

addSearchEventListener(searchBoxOrigin, suggestionsDivOrigin);
addSearchEventListener(searchBoxDest, suggestionsDivDest);

function addSearchEventListener(searchBox, suggestionsDiv) {
    searchBox.addEventListener("input", () => {
        const searchText = searchBox.value.trim();
        if (searchText.length > 2) {
            fetch(`http://127.0.0.1:5000/search?q=${searchText}`)
                .then(response => response.json())
                .then(data => {
                    showSuggestions(data, searchBox, suggestionsDiv);
                })
                .catch(error => {
                    console.error('Error fetching data:', error);
                });
        } else {
            suggestionsDiv.style.display = "none";
        }
    });
}

function showSuggestions(bases, searchBox, suggestionsDiv) {
    suggestionsDiv.innerHTML = '';
    if (bases.length === 0) {
        suggestionsDiv.style.display = "none";
        return;
    }

    const ul = document.createElement('ul');
    bases.forEach(base => {
        const li = document.createElement('li');
        li.textContent = base.base_name;
        li.addEventListener('click', () => {
            searchBox.value = base.base_name;
            suggestionsDiv.style.display = "none";
        });
        ul.appendChild(li);
    });

    suggestionsDiv.appendChild(ul);
    suggestionsDiv.style.display = "block";
    
}
