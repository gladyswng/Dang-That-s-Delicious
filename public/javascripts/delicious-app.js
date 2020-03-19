import '../sass/style.scss';

import { $, $$ } from './modules/bling';

import autocomplete from './modules/autocomplete'
import typeAhead from './modules/typeAhead'
import makeMap from './modules/map'
import ajaxHeart from './modules/heart'

autocomplete($('#address'), $('#lat'), $('#lng'))

typeAhead( $('.search') )

// Here we're using bling.js to give it an ID of map
// Without any thing further if we go back to home page we'll see null since we can't find anything on that page
makeMap( $('#map') )
const heartForms = $$('form.heart')
heartForms.on('submit', ajaxHeart) // because of bling.js we can listan to all without having to loop over each