import axios from 'axios'
import { $ } from './bling'

// Or detect it from the user with navigator.geolocation.getCurrentPosition

const mapOptions = {
    center: { lat: 43.2, lng: -79.8 },
    zoom: 8
}

function loadPlaces(map, lat = 43.2, lng = -79.8) {
    axios.get(`/api/stores/near?lat=${lat}&lng=${lng}`)
    .then(res => {
        const places = res.data
        if (!places.length) {
            alert('No places found')
            return // When there's nothing else for us to do
        }

        // create a bounds

        // In order to zoom in so that all the markers fit but now zooming too far at the same time
        // when we loop over each of these places we're also going to extend our bounds so that it will fit each of these markers
        const bounds = new google.maps.LatLngBounds()


        // info window

        const infoWindow = new google.maps.InfoWindow()

        const markers = places.map(place => {
            const [placeLng, placeLat] = place.location.coordinates
            
            const position = { lat: placeLat, lng: placeLng }

            // extend bounds so it fits each of these markers
            bounds.extend(position)

            const marker = new google.maps.Marker({ map, position})
            marker.place = place
            return marker
            // The place is the obj with data from our API, we want to attach data to the marker, because when somebody clicks the marker, we need some way to reference that actual place data.
            // now we store place on the marker so we have access to it.
        })


        // When someone clicks on a marker, show the details of that place
        markers.forEach(marker => marker.addListener('click', function() {
            const html = `
                <div class="popup">
                    <a href="/store/${this.place.slug}">
                        <img src="/uploads/${this.place.photo || 'store.png'}" alt="${this.place.name}"/>
                        <p>${this.place.name} - ${this.place.location.address}</p>
                    </a>
                </div>
            `
            // "this" is the marker it self here, it contains "place" with the information we added 
            infoWindow.setContent(html)
            infoWindow.open(map, this) // where do you want it to open, here - put it on to map

        }))


        // then zoom the map to fit all the markers perfectly
        map.setCenter(bounds.getCenter())
        map.fitBounds(bounds)
        
    })
}

// Pass in a div with an id of map
function makeMap(mapDiv) { 

    if(!mapDiv) return // won't return on that specific page

    // layout.pug has already loaded in google maps js library for us
    // make our map
    const map = new google.maps.Map(mapDiv, mapOptions)
    loadPlaces(map)

    const input = $('[name="geolocate"]')

    const autocomplete = new google.maps.places.Autocomplete(input)

    autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace()
        const { lat, lng } = place.geometry.location
       
        loadPlaces(map, lat(), lng())
    })


}

export default makeMap