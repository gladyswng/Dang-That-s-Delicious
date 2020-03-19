import axios from 'axios'
import dompurify from 'dompurify'

function searchResultsHTML(stores) {
    return stores.map(store => {
        return `
            <a href="/store/${store.slug}" class="search__result">
                <strong>${store.name}</strong>
            </a>

        `
    }).join('') // we don't want an array of html, we want a chunch of html - one string not three strings in an array
}


function typeAhead(search) {
    if (!search) return

    const searchInput = search.querySelector('input[name="search"]') // Select input with the name of "search"

    const searchResults = search.querySelector('.search__results')

    // on -- addEventListener
    searchInput.on('input', function() {
        // if there's no value, quit
        if(!this.value) {
    
            searchResults.style.display = 'none'  // hide it
            return // stop
        }

        // show the search results
        searchResults.style.display = 'block'


        axios
            .get(`/api/search?q=${this.value}`)
            .then(res => {
                if(res.data.length) {
                    searchResults.innerHTML = dompurify(searchResultsHTML(res.data))
                    return
                }
                
                // tell user nothing came back
                searchResults.innerHTML = dompurify(`<div class="search__result">No results for ${this.value} found</div>`)
            })
            .catch(err => {
                console.error(err)
            })
    }) 

    // Handle keyboard inputs
    searchInput.on('keyup', e => {
        // console.log(e.keyCode) to find out the number

        // if they aren't pressing up, down or enter, who cares
        if (![38, 40, 13].includes(e.keyCode)) {
            return // nah
        }


        // We have already an active class to mark each one as active
        const activeClass = 'search__result--active'
        const current = search.querySelector(`.${activeClass}`)
        const items = search.querySelectorAll('.search__result')
        let next
        if (e.keyCode === 40 && current) {
            next = current.nextElementSibling || items[0] // fall back to first item if no next
        } else if (e.keyCode === 40) { // if press down and there's no current
            next = items[0]
        } else if (e.keyCode === 38 && current) {
            next = current.previousElementSibling || items[items.length -1]
        } else if (e.keyCode === 38) {
            next = items[items.length -1]
        } else if (e.keyCode === 13 && current.href) {
            window.location = current.href
            // When hit 'enter' we need to stop this function from running
            return
        }

        if (current) {
            current.classList.remove(activeClass)
        }
        next.classList.add(activeClass)
    })
} 

export default typeAhead