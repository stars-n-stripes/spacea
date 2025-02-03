const searchBoxOrigin = document.getElementById('search-box-origin');
const suggestionsOriginDiv = document.getElementById('suggestions-origin');
const searchBoxDest = document.getElementById('search-box-dest');
const suggestionsDestDiv = document.getElementById('suggestions-dest');



let map; // initialize the map after page loads
let originMarker = null;
let destMarker = null;
let routeLine; // store the route line
let allBases = {}; // store the bases data

document.addEventListener('DOMContentLoaded', () => {
    map = L.map('map').setView([37.8, -96], 4);  // Center on the US and zoom out
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
});

addSearchEventListener(searchBoxOrigin, suggestionsOriginDiv, true);
addSearchEventListener(searchBoxDest, suggestionsDestDiv, false);

function addSearchEventListener(searchBox, suggestionsDiv, isOrigin) {
    searchBox.addEventListener("input", () => {
        const searchText = searchBox.value.trim();
        if (searchText.length > 2) {
            fetch(`http://127.0.0.1:5000/search?q=${searchText}`)
                .then(response => response.json())
                .then(data => {
                    data.forEach(base => {
                        allBases[base.base_name] = base;
                    });
                    showSuggestions(data, searchBox, suggestionsDiv, isOrigin);
                })
                .catch(error => {
                    console.error('Error fetching data:', error);
                });
        } else {
            suggestionsDiv.style.display = "none";
        }
    });
}

function showSuggestions(bases, searchBox, suggestionsDiv, isOrigin) {
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

            updateMarker(base, isOrigin);

            // check if both origin and destination are selected
            checkAndCreateRoute();

        });
        ul.appendChild(li);
    });

    suggestionsDiv.appendChild(ul);
    suggestionsDiv.style.display = "block";

}

function updateMarker(base, isOrigin) {
    if (base.latitude && base.longitude) {
        // remove existing marker for the base, if any
        if (isOrigin && originMarker) {
            map.removeLayer(originMarker);
        } else if (!isOrigin && destMarker) {
            map.removeLayer(destMarker);
            destMarker = null;
        }

        // add a new marker
        const marker = L.marker([base.latitude, base.longitude]).addTo(map);
        marker.bindPopup(base.base_name); // add a popup with the base name
        if (isOrigin) {
            originMarker = marker;
        } else {
            destMarker = marker;
        }

        // center the map on the new marker
        map.setView([base.latitude, base.longitude], 10);  // you might adjust the zoom level

    }
}

function createRoutingControl() {
    console.log("creating route...function called.");
    // remove existing route line, if any
    if (routeLine) {
        map.removeLayer(routeLine);
        routeLine = null;
    }

    // check if both origin and destination are selected
    if (!searchBoxOrigin.value || !searchBoxDest.value) {
        console.log("Origin or Destination not selected.");
        return;
    }
    
    // get the origin and destination base names
    const originBase = allBases[searchBoxOrigin.value];
    const destBase = allBases[searchBoxDest.value];

    console.log("Origin Base:", originBase);
    console.log("Destination Base:", destBase);

    // create a new route line
    if (originBase && destBase) {
        const origin = L.latLng(originBase.latitude, originBase.longitude);
        const destination = L.latLng(destBase.latitude, destBase.longitude);
        
        console.log("Origin LatLng:", origin);
        console.log("Destination LatLng:", destination);
        midpoint = getMidPoint(origin, destination);

        console.log("Origin type: ", typeof origin, "Destination type: ", typeof destination, "Midpoint type: ", typeof midpoint);

        // create a great-circle path using Leaflet.curve
        routeLine = L.curve([
            'M', origin,
            'Q', getMidPoint(origin, destination),
            destination], {
                color: 'blue',   // customize the line color
                weight: 3,       // customize the line weight
                animate: 1000,   // animate the line drawing
        }).addTo(map);

        console.log("Route Line:", routeLine);

        // fit the map view to the bounds of the route
        map.fitBounds(routeLine.getBounds());
    } else {
        console.log("Origin or Destination not found.");
    }
}

function checkAndCreateRoute() {
    console.log("Origin:", searchBoxOrigin.value, "Dest:", searchBoxDest.value); // Debug print

    
    if (searchBoxOrigin.value && searchBoxDest.value) {
        createRoutingControl();
    }
}

// Helper function to get a midpoint for the curve (for a more curved appearance)
function getMidPoint(latlng1, latlng2) {
    console.log("getMidPoint called with:", latlng1, latlng2); // Debug print
    const offset = 0.6;     // adjust for curve
    const lat = (latlng1.lat + latlng2.lat) / 2;
    const lng = (latlng1.lng + latlng2.lng) / 2;
    const offsetX = (latlng2.lng - latlng2.lng) * offset;
    const offsetY = (latlng2.lat - latlng2.lat) * offset;  // inverted for curve
    const midpoint = L.latLng(lat + offsetY, lng + offsetX);
    console.log("Midpoint calculated:", midpoint); // Debug print
    return midpoint;
}