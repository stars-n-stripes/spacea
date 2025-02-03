const searchBoxOrigin = document.getElementById('search-box-origin');
const suggestionsDivOrigin = document.getElementById('suggestions-origin');
const searchBoxDest = document.getElementById('search-box-dest');
const suggestionsDivDest = document.getElementById('suggestions-dest');



let map; // initialize the map after page loads
let baseMarkers = {}; // store markers for bases to remove them later
let routeLine; // store the route line
let bases = []; // store the bases data

document.addEventListener('DOMContentLoaded', () => {
    map = L.map('map').setView([37.8, -96], 4);  // Center on the US and zoom out
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
});

addSearchEventListener(searchBoxOrigin, suggestionsDivOrigin);
addSearchEventListener(searchBoxDest, suggestionsDivDest);

function addSearchEventListener(searchBox, suggestionsDiv) {
    searchBox.addEventListener("input", () => {
        const searchText = searchBox.value.trim();
        if (searchText.length > 2) {
            fetch(`http://127.0.0.1:5000/search?q=${searchText}`)
                .then(response => response.json())
                .then(data => {
                    bases = data;  // store the bases data for later use
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

            updateMarker(base);
        });
        ul.appendChild(li);
    });

    suggestionsDiv.appendChild(ul);
    suggestionsDiv.style.display = "block";

}

function updateMarker(base) {
    if (base.latitude && base.longitude) {
        // remove existing marker for the base, if any
        if (baseMarkers[base.base_name]) {
            map.removeLayer(baseMarkers[base.base_name]);
        }

        // add a new marker
        const marker = L.marker([base.latitude, base.longitude]).addTo(map);
        marker.bindPopup(base.base_name); // add a popup with the base name
        baseMarkers[base.base_name] = marker;  // store the marker for the future removal

        // center the map on the new marker
        map.setView([base.latitude, base.longitude], 10);  // you might adjust the zoom level

        // add routing control after both origin and destination are selected
        if (searchBoxOrigin.value && searchBoxDest.value) {
            createRoutingControl();
        } else {
            console.log('Origin:', searchBoxOrigin.value);  // log origin value
            console.log('Destination:', searchBoxDest.value);  // log destination value
        }
    }
}

function createRoutingControl() {
    // remove existing route line, if any
    if (routeLine) {
        map.removeLayer(routeLine);
    }

    // get the origin and destination base names
    const originBase = bases.find(base => base.base_name === searchBoxOrigin.value);
    const destBase = bases.find(base => base.base_name === searchBoxDest.value);

    // create a new route line
    if (originBase && destBase) {
        const origin = L.latLng(originBase.latitude, originBase.longitude);
        const destination = L.latLng(destBase.latitude, destBase.longitude);

        // create a great-circle path using Leaflet.curve
        routeLine = L.curve([
            'M', origin,
            'Q', getMidPoint(origin, destination),
            destination], {
                color: 'blue',   // customize the line color
                weight: 3,       // customize the line weight
                animate: 1000,   // animate the line drawing
        }).addTo(map);

        // fit the map view to the bounds of the route
        map.fitBounds(routeLine.getBounds());
    }
}

// Helper function to get a midpoint for the curve (for a more curved appearance)
function getMidPoint(latlng1, latlng2) {
    const offset = 0.6;     // adjust for curve
    const lat = (latlng1.lat + latlng2.lat) / 2;
    const lng = (latlng1.lng + latlng2.lng) / 2;
    const offsetX = (latlng2.lng - latlng2.lng) * offset;
    const offsetY = (latlng2.lat - latlng2.lat) * offset;  // inverted for curve
    return L.latLng(lat + offsetY, lng + offsetX);
}