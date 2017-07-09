import axios from 'axios';
import { $ } from './bling';

let map;
let infoWindow;

const mapOptions = {
  center: {
    lat: 43.2,
    lng: -79.8
  },
  zoom: 8
};

function loadPlaces(map, lat = mapOptions.center.lat, lng = mapOptions.center.lng) {
  axios.get(`/api/stores/near?lat=${lat}&lng=${lng}`)
    .then(res => {
      const places = res.data;
      if (!places.length) {
        alert('No places found!');
        return;
      }

      // create a bounds
      const bounds = new google.maps.LatLngBounds();
      infoWindow = new google.maps.InfoWindow();

      // 

      const markers = places.map(place => {
        const [placeLng, placeLat] = place.location.coordinates;
        const position = { lat: placeLat, lng: placeLng };
        bounds.extend(position);
        const marker = new google.maps.Marker({ map, position });
        marker.place = place;

        return marker;
      });

      // when someone clicks on a marker, show the details of that place
      markers.forEach(marker => marker.addListener('click', function() {
        const html = `
          <div class="popup">
            <a href="/store/${this.place.slug}">
              <img src="/uploads/${this.place.photo || 'store.png'}" alt="${this.place.name}" />
              <p>${this.place.name} - ${this.place.location.address}</p>
            </a>
          </div>
        `;

        infoWindow.setContent(html);
        infoWindow.open(map, this);
        
      }));

      // then zoom the map to fit all the markers perfectly
      map.setCenter(bounds.getCenter());
      map.fitBounds(bounds);
    });
}

function makeMap(mapDiv) {
  if (!mapDiv) {
    return;
  }
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
      mapOptions.center.lat = position.coords.latitude;
      mapOptions.center.lng = position.coords.longitude;

      // make our map
      map = new google.maps.Map(mapDiv, mapOptions);
      loadPlaces(map);
    }, function() {
      // atm its served under http and we get an error. also my safari is blocked by default
      map = new google.maps.Map(mapDiv, mapOptions);
      loadPlaces(map);
      // handleLocationError(true, infoWindow, map.getCenter());
    });
  }

  const input = $('[name="geolocate"]');
  const autocomplete = new google.maps.places.Autocomplete(input);
  autocomplete.addListener('place_changed', () => {
    const place = autocomplete.getPlace();
    loadPlaces(map, place.geometry.location.lat(), place.geometry.location.lng());
  });
}

function handleLocationError(browserHasGeolocation, infoWindow, pos) {
  infoWindow.setPosition(pos);
  infoWindow.setContent(browserHasGeolocation ? 'Error: The Geolocation service failed.' : 'Error: Your browser doesn\'t support geolocation.');
  infoWindow.open(map);
}

export default makeMap;