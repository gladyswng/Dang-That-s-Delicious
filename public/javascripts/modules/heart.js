import axios from 'axios'
import { $ } from './bling'

function ajaxHeart(e) {
    e.preventDefault()
    console.log('HEART IT')
    // .this equal to the thing that this function was called against which is the form tag
    axios
        .post(this.action)
        .then(res => {
            // this.heart gives us attribute with name="heart" in the form tag
            const isHearted = this.heart.classList.toggle('heart__button--hearted')
            $('.heart-count').textContent = res.data.hearts.length 
            // how many hearts in that array

            if(isHearted) {
                this.heart.classList.add('heart__button--float')
                setTimeout(() => this.heart.classList.remove('heart__button--float'), 2500)
                // arrow function here so we can use this. and still reference the actual form tag
            }
        
        })
        .catch(console.error)
}

export default ajaxHeart